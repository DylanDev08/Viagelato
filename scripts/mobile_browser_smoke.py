#!/usr/bin/env python3
"""Real mobile Chromium smoke. No checkout, WhatsApp or database writes."""
import json
import os
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get("BASE_URL", "https://viagelato.vercel.app").rstrip("/")
OUT = Path("mobile-smoke")
OUT.mkdir(exist_ok=True)
DEVICES = [(320, 740), (390, 844), (430, 932), (768, 1024)]
failures, report = [], []


def check(ok, message):
    print(("PASS: " if ok else "FAIL: ") + message, flush=True)
    if not ok:
        failures.append(message)


def metrics(page):
    return page.evaluate("""() => {
      const root = document.documentElement;
      const overflowElements = [...document.querySelectorAll('body *')]
        .filter(el => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' &&
            r.width > 0 && r.height > 0 &&
            (r.right > innerWidth + 3 || r.left < -3);
        }).slice(0, 7).map(el => ({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 90),
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right)
        }));
      return {
        width: innerWidth, clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        documentOverflow: root.scrollWidth - root.clientWidth,
        overflowingElements: overflowElements,
        touch: matchMedia('(hover: none)').matches
      };
    }""")


def inspect(page, label, width, screenshot=False):
    # Suspense can briefly render the loader; wait for the actual storefront shell.
    page.locator(".site-header:visible").first.wait_for(state="visible", timeout=24000)
    page.locator("main").first.wait_for(state="visible", timeout=20000)
    page.evaluate("() => document.fonts.ready")
    page.wait_for_timeout(450)  # allow React event handlers to hydrate
    result = metrics(page)
    report.append({"device": width, "route": label, **result})
    print(f"METRICS {width}px {label}: {json.dumps(result, ensure_ascii=False)}", flush=True)
    check(result["documentOverflow"] <= 2,
          f"{width}px {label}: no page overflow ({result['documentOverflow']}px)")
    if screenshot:
        page.screenshot(path=str(OUT / f"{width}-{label}.png"),
                        full_page=False, animations="disabled")
    return result


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width, height in DEVICES:
            context = browser.new_context(viewport={"width": width, "height": height},
                                          device_scale_factor=1, is_mobile=True,
                                          has_touch=True, locale="es-AR")
            page = context.new_page()
            page.set_default_timeout(14000)
            try:
                page.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=35000)
                inspect(page, "home", width, screenshot=width in (320, 390, 430))
                cart_icon = page.locator(".header-cart").bounding_box()
                check(bool(cart_icon and cart_icon["width"] >= 43 and cart_icon["height"] >= 43),
                      f"{width}px: header cart tap target >=44px")
                menu = page.get_by_role("button", name="Abrir menú")
                check(menu.is_visible(), f"{width}px: mobile menu visible")
                menu.click()
                expect(page.get_by_role("button", name="Cerrar menú")).to_be_visible()
                check(page.locator("#mobile-navigation").get_attribute("aria-hidden") == "false",
                      f"{width}px: menu opens accessibly")
                page.locator("main").first.evaluate(
                    "(el) => el.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}))"
                )
                check(page.get_by_role("button", name="Abrir menú").is_visible(),
                      f"{width}px: outside tap closes menu")

                page.goto(BASE_URL + "/catalogo", wait_until="domcontentloaded", timeout=35000)
                inspect(page, "catalogo", width, screenshot=width in (390, 430))
                grid = page.locator(".priced-grid").first
                grid.wait_for(state="visible", timeout=17000)
                columns = grid.evaluate(
                    "(el) => getComputedStyle(el).gridTemplateColumns.split(' ').length")
                expected = 1 if width < 390 else 2
                check(columns == expected,
                      f"{width}px: catalog has {columns} columns, expected {expected}")
                add = page.locator(".priced-add-button:not([disabled])").first
                add.wait_for(state="visible", timeout=14000)
                rect = add.bounding_box()
                check(bool(rect and rect["height"] >= 43),
                      f"{width}px: add button tap height >=44px")
                add.click()
                expect(page.locator(".floating-actions.has-cart-items")).to_be_visible()
                page.goto(BASE_URL + "/carrito", wait_until="domcontentloaded", timeout=35000)
                page.locator(".cart-line").first.wait_for(state="visible", timeout=17000)
                inspect(page, "carrito", width, screenshot=width in (320, 390, 430))
                check(page.locator(".floating-actions").count() == 0,
                      f"{width}px: no floating bar overlay on cart")
                fields = page.locator(".cart-form-panel input:not([type=radio])")
                if fields.count():
                    font_size = fields.first.evaluate(
                        "(el) => parseFloat(getComputedStyle(el).fontSize)")
                    check(font_size >= 16, f"{width}px: input font avoids mobile zoom")
                qty = page.locator(".cart-line .qty button").first.bounding_box()
                check(bool(qty and qty["width"] >= 43 and qty["height"] >= 43),
                      f"{width}px: quantity button has a 44px touch target")
            except Exception as error:
                failures.append(f"{width}px: {type(error).__name__}: {error}")
                print("ERROR " + traceback.format_exc(), flush=True)
                try:
                    page.screenshot(path=str(OUT / f"{width}-error.png"), full_page=False)
                except Exception:
                    pass
            finally:
                context.close()
        browser.close()


try:
    run()
finally:
    (OUT / "report.json").write_text(
        json.dumps({"base_url": BASE_URL, "checks": report, "failures": failures},
                   ensure_ascii=False, indent=2), encoding="utf-8")
if failures:
    raise SystemExit(f"{len(failures)} mobile checks failed; see report.json.")
print("VIAGELATO_MOBILE_BROWSER_OK", flush=True)
