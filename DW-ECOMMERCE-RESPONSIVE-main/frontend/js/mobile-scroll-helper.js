/**
 * Mobile Scroll Helper (SAFE VERSION)
 * Only enhances horizontal carousels — DOES NOT modify rows or body.
 * Prevents scroll freezing on products page.
 */

(function () {
    "use strict";

    function isMobile() {
        return window.innerWidth <= 991;
    }

    // ONLY apply horizontal scroll to carousels — nothing else
    function enableCarouselScroll() {
        const carousels = document.querySelectorAll(".product-carousel__wrapper");

        carousels.forEach(wrapper => {
            if (isMobile()) {
                wrapper.classList.add("horizontal-scroll");
                wrapper.style.overflowX = "auto";
                wrapper.style.webkitOverflowScrolling = "touch";
            } else {
                wrapper.classList.remove("horizontal-scroll");
                wrapper.style.overflowX = "";
            }
        });
    }

    // Initialize
    function init() {
        enableCarouselScroll();
    }

    // Run on page load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Run on resize
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(init, 150);
    });

})();
