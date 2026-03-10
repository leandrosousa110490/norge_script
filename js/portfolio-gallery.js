/**
 * Portfolio Gallery Slider
 * Dynamic, center-focused gallery with autoplay, drag and lightbox controls.
 */

document.addEventListener('DOMContentLoaded', function () {
    initProjectGallery();
});

function initProjectGallery() {
    var galleryContainer = document.querySelector('.project-gallery');
    var prevBtn = document.querySelector('.gallery-nav.prev-btn');
    var nextBtn = document.querySelector('.gallery-nav.next-btn');
    var section = document.querySelector('.project-gallery-section');

    if (!galleryContainer || !prevBtn || !nextBtn) {
        return;
    }

    var galleryImages = [
        { src: 'images/about11.jpg', alt: 'Sign Project 1', title: 'Channel Letter Installation', details: 'Retail storefront, Miami Beach' },
        { src: 'images/about12.jpg', alt: 'Sign Project 2', title: 'LED Sign Conversion', details: 'Restaurant upgrade, Doral' },
        { src: 'images/about13.jpg', alt: 'Sign Project 3', title: 'Monument Sign', details: 'Commercial center, Kendall' },
        { src: 'images/about14.jpg', alt: 'Sign Project 4', title: 'Storefront Signage', details: 'Boutique branding, Brickell' },
        { src: 'images/about15.jpg', alt: 'Sign Project 5', title: 'Window Graphics', details: 'Franchise package, Orlando' },
        { src: 'images/about16.jpg', alt: 'Sign Project 6', title: 'Dimensional Letters', details: 'Lobby feature, Fort Lauderdale' },
        { src: 'images/about17.jpg', alt: 'Sign Project 7', title: 'Vehicle Graphics', details: 'Fleet branding, Tampa' },
        { src: 'images/about21.jpg', alt: 'Sign Project 8', title: 'ADA Compliant Signs', details: 'Office campus, Weston' },
        { src: 'images/about22.jpg', alt: 'Sign Project 9', title: 'Restaurant Signage', details: 'Hospitality brand, Miami' },
        { src: 'images/about31.jpg', alt: 'Sign Project 10', title: 'Corporate Signage', details: 'Office tower, Downtown Miami' },
        { src: 'images/about32.jpg', alt: 'Sign Project 11', title: 'Office Building Sign', details: 'Facade identity, Aventura' },
        { src: 'images/about33.jpg', alt: 'Sign Project 12', title: 'Directory Signs', details: 'Mixed-use complex, Coral Gables' }
    ];

    var state = {
        index: 0,
        autoTimer: null,
        isDragging: false,
        dragStartX: 0,
        dragStartLeft: 0,
        isHovering: false,
        dragMoved: false,
        suppressClickUntil: 0,
        wheelVelocity: 0,
        wheelRaf: null,
        pressedItemIndex: null
    };

    galleryContainer.innerHTML = '';
    galleryImages.forEach(function (image, index) {
        var item = document.createElement('article');
        item.className = 'gallery-item';
        item.setAttribute('data-index', String(index));
        item.setAttribute('tabindex', '0');
        item.innerHTML = [
            '<img src="' + image.src + '" alt="' + image.alt + '" class="gallery-img">',
            '<button type="button" class="gallery-zoom-trigger" aria-label="Enlarge ' + image.title + '"><i class="bi bi-arrows-fullscreen"></i></button>',
            '<div class="gallery-item-caption">',
            '  <h5>' + image.title + '</h5>',
            '  <p>' + image.details + '</p>',
            '</div>'
        ].join('');
        galleryContainer.appendChild(item);
    });

    var galleryItems = Array.prototype.slice.call(galleryContainer.querySelectorAll('.gallery-item'));
    if (!galleryItems.length) {
        return;
    }

    section = section || galleryContainer.closest('.project-gallery-section');
    if (section && !section.querySelector('.gallery-indicators')) {
        var indicators = document.createElement('div');
        indicators.className = 'gallery-indicators';
        indicators.setAttribute('aria-label', 'Project gallery indicators');
        indicators.innerHTML = galleryImages.map(function (_, idx) {
            return '<button type="button" class="gallery-dot" data-dot-index="' + idx + '" aria-label="View image ' + (idx + 1) + '"></button>';
        }).join('');
        section.appendChild(indicators);
    }

    var indicatorDots = Array.prototype.slice.call(document.querySelectorAll('.gallery-dot'));
    var scrollTicking = false;

    function scrollToIndex(index, smooth) {
        var item = galleryItems[index];
        if (!item) {
            return;
        }

        var targetLeft = item.offsetLeft - (galleryContainer.clientWidth - item.offsetWidth) * 0.5;
        galleryContainer.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    function updateActiveByCenter() {
        var center = galleryContainer.scrollLeft + galleryContainer.clientWidth * 0.5;
        var closest = 0;
        var smallest = Number.POSITIVE_INFINITY;

        galleryItems.forEach(function (item, idx) {
            var itemCenter = item.offsetLeft + item.offsetWidth * 0.5;
            var delta = Math.abs(itemCenter - center);
            if (delta < smallest) {
                smallest = delta;
                closest = idx;
            }
        });

        state.index = closest;
        updateItemClasses();
        updateControls();
    }

    function updateItemClasses() {
        galleryItems.forEach(function (item, idx) {
            var delta = Math.abs(idx - state.index);
            item.classList.toggle('is-active', idx === state.index);
            item.classList.toggle('is-near', delta === 1);
        });

        indicatorDots.forEach(function (dot, idx) {
            dot.classList.toggle('is-active', idx === state.index);
        });
    }

    function updateControls() {
        prevBtn.disabled = state.index <= 0;
        nextBtn.disabled = state.index >= galleryItems.length - 1;
    }

    function setIndex(index, smooth) {
        state.index = Math.max(0, Math.min(index, galleryItems.length - 1));
        updateItemClasses();
        updateControls();
        scrollToIndex(state.index, smooth);
    }

    function next() {
        var nextIndex = state.index + 1;
        if (nextIndex > galleryItems.length - 1) {
            nextIndex = 0;
        }
        setIndex(nextIndex, true);
    }

    function prev() {
        var prevIndex = state.index - 1;
        if (prevIndex < 0) {
            prevIndex = galleryItems.length - 1;
        }
        setIndex(prevIndex, true);
    }

    function startAutoplay() {
        stopAutoplay();
        state.autoTimer = window.setInterval(function () {
            if (!state.isHovering && !state.isDragging) {
                next();
            }
        }, 4200);
    }

    function stopAutoplay() {
        if (state.autoTimer !== null) {
            window.clearInterval(state.autoTimer);
            state.autoTimer = null;
        }
    }

    function beginDrag(clientX) {
        state.isDragging = true;
        state.dragStartX = clientX;
        state.dragStartLeft = galleryContainer.scrollLeft;
        state.dragMoved = false;
        galleryContainer.classList.add('is-dragging');
        stopAutoplay();
    }

    function moveDrag(clientX) {
        if (!state.isDragging) {
            return;
        }
        var delta = clientX - state.dragStartX;
        if (Math.abs(delta) > 6) {
            state.dragMoved = true;
        }
        galleryContainer.scrollLeft = state.dragStartLeft - delta;
    }

    function endDrag() {
        if (!state.isDragging) {
            return;
        }
        state.isDragging = false;
        galleryContainer.classList.remove('is-dragging');

        if (!state.dragMoved && Number.isInteger(state.pressedItemIndex) && state.pressedItemIndex >= 0) {
            var openIndex = state.pressedItemIndex;
            state.pressedItemIndex = null;
            state.suppressClickUntil = Date.now() + 260;
            openLightbox(openIndex);
            startAutoplay();
            return;
        }

        state.pressedItemIndex = null;
        if (state.dragMoved) {
            state.suppressClickUntil = Date.now() + 180;
        }
        updateActiveByCenter();
        setIndex(state.index, true);
        startAutoplay();
    }

    function startWheelMomentum() {
        if (state.wheelRaf !== null) {
            return;
        }

        var tick = function () {
            galleryContainer.scrollLeft += state.wheelVelocity;
            state.wheelVelocity *= 0.88;

            if (Math.abs(state.wheelVelocity) < 0.18) {
                state.wheelVelocity = 0;
                state.wheelRaf = null;
                updateActiveByCenter();
                return;
            }

            state.wheelRaf = window.requestAnimationFrame(tick);
        };

        state.wheelRaf = window.requestAnimationFrame(tick);
    }

    function openLightbox(index) {
        var lightbox = document.createElement('div');
        lightbox.className = 'gallery-lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');

        lightbox.innerHTML = [
            '<div class="lightbox-content">',
            '  <button type="button" class="lightbox-close" aria-label="Close image">&times;</button>',
            '  <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image"><i class="bi bi-chevron-left"></i></button>',
            '  <button type="button" class="lightbox-nav lightbox-next" aria-label="Next image"><i class="bi bi-chevron-right"></i></button>',
            '  <img src="" alt="" class="lightbox-image">',
            '  <div class="lightbox-caption"><h5></h5><p></p></div>',
            '</div>'
        ].join('');

        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        var activeIndex = index;
        var imageNode = lightbox.querySelector('.lightbox-image');
        var titleNode = lightbox.querySelector('.lightbox-caption h5');
        var detailNode = lightbox.querySelector('.lightbox-caption p');

        function renderLightbox() {
            var data = galleryImages[activeIndex];
            imageNode.src = data.src;
            imageNode.alt = data.alt;
            titleNode.textContent = data.title;
            detailNode.textContent = data.details;
        }

        function closeLightbox() {
            document.removeEventListener('keydown', onKeydown);
            if (lightbox.parentNode) {
                lightbox.parentNode.removeChild(lightbox);
            }
            document.body.style.overflow = '';
        }

        function shift(step) {
            activeIndex = (activeIndex + step + galleryImages.length) % galleryImages.length;
            renderLightbox();
        }

        function onKeydown(event) {
            if (event.key === 'Escape') {
                closeLightbox();
            } else if (event.key === 'ArrowRight') {
                shift(1);
            } else if (event.key === 'ArrowLeft') {
                shift(-1);
            }
        }

        lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-next').addEventListener('click', function () { shift(1); });
        lightbox.querySelector('.lightbox-prev').addEventListener('click', function () { shift(-1); });

        lightbox.addEventListener('click', function (event) {
            if (event.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', onKeydown);
        requestAnimationFrame(function () {
            lightbox.classList.add('is-visible');
        });

        renderLightbox();
    }

    prevBtn.addEventListener('click', function () {
        prev();
    });

    nextBtn.addEventListener('click', function () {
        next();
    });

    indicatorDots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            var dotIndex = Number(dot.getAttribute('data-dot-index'));
            if (!Number.isNaN(dotIndex)) {
                setIndex(dotIndex, true);
            }
        });
    });

    galleryItems.forEach(function (item, idx) {
        var zoomButton = item.querySelector('.gallery-zoom-trigger');
        if (zoomButton) {
            zoomButton.addEventListener('click', function (event) {
                event.stopPropagation();
                openLightbox(idx);
            });
        }

        item.addEventListener('click', function () {
            if (Date.now() < state.suppressClickUntil) {
                return;
            }
            openLightbox(idx);
        });

        item.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openLightbox(idx);
            }
        });
    });

    galleryContainer.addEventListener('scroll', function () {
        if (scrollTicking) {
            return;
        }
        scrollTicking = true;
        window.requestAnimationFrame(function () {
            scrollTicking = false;
            updateActiveByCenter();
        });
    }, { passive: true });

    galleryContainer.addEventListener('mouseenter', function () {
        state.isHovering = true;
        stopAutoplay();
    });

    galleryContainer.addEventListener('mouseleave', function () {
        state.isHovering = false;
        if (!state.isDragging) {
            startAutoplay();
        }
    });

    galleryContainer.addEventListener('wheel', function (event) {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            state.wheelVelocity += event.deltaY * 0.32;
            state.wheelVelocity = Math.max(-70, Math.min(70, state.wheelVelocity));
            startWheelMomentum();
            event.preventDefault();
        }
    }, { passive: false });

    galleryContainer.addEventListener('pointerdown', function (event) {
        if (event.target && event.target.closest('.gallery-zoom-trigger')) {
            return;
        }
        var clickedItem = event.target && event.target.closest('.gallery-item');
        state.pressedItemIndex = clickedItem ? Number(clickedItem.getAttribute('data-index')) : null;
        beginDrag(event.clientX);
        galleryContainer.setPointerCapture(event.pointerId);
    });

    galleryContainer.addEventListener('pointermove', function (event) {
        moveDrag(event.clientX);
    });

    galleryContainer.addEventListener('pointerup', endDrag);
    galleryContainer.addEventListener('pointercancel', endDrag);

    if ('IntersectionObserver' in window && section) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    startAutoplay();
                } else {
                    stopAutoplay();
                }
            });
        }, { threshold: 0.35 });
        io.observe(section);
    } else {
        startAutoplay();
    }

    window.requestAnimationFrame(function () {
        setIndex(0, false);
        galleryItems.forEach(function (item, idx) {
            window.setTimeout(function () {
                item.classList.add('animate-visible');
            }, idx * 55);
        });
    });
}
