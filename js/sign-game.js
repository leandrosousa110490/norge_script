/**
 * Sign Placement Game
 * A fun interactive game where users place a sign on a storefront
 * with confetti celebration and animated elements
 */

// Initialize the game once DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the game container exists
    if(document.getElementById('sign-game-container')) {
        initSignGame();
        initAnimations();
    }
});

/**
 * Initialize the sign placement game
 */
function initSignGame() {
    const gameContainer = document.getElementById('sign-game-container');
    const signElement = document.getElementById('draggable-sign');
    const targetArea = document.getElementById('sign-target-area');
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    let isPlaced = false;
    
    // Set up initial state
    if(!gameContainer || !signElement || !targetArea) return;
    
    // Set initial position for the sign - keep it in the upper half of the game area
    signElement.style.left = '10%';
    signElement.style.top = '30%';
    
    // Ensure sign is visible initially with proper z-index
    signElement.style.zIndex = '6';
    
    // Setup dragging events for the sign
    signElement.addEventListener('mousedown', startDrag);
    signElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    
    // Functions for dragging
    function startDrag(e) {
        if(isPlaced) return;
        
        // Prevent event from propagating
        e.stopPropagation();
        
        isDragging = true;
        
        // Calculate the offset of the mouse pointer from the element's top-left corner
        const rect = signElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        // Add dragging class for visual feedback
        signElement.classList.add('dragging');
        
        // Ensure sign is visible during drag
        signElement.style.zIndex = '100';
        
        // Prevent default behavior to avoid text selection, etc.
        e.preventDefault();
        
        // Play sound effect
        playSound('pickup');

        // Hide instructions
        const instructions = gameContainer.querySelector('.game-instructions');
        if (instructions) {
            instructions.style.display = 'none';
        }
    }
    
    function handleTouchStart(e) {
        if(isPlaced) return;
        
        // Prevent event from propagating
        e.stopPropagation();
        
        const touch = e.touches[0];
        
        // Set the event's clientX and clientY to the touch's coordinates
        const touchEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation()
        };
        
        // Call the mousedown handler with the touch coordinates
        startDrag(touchEvent);
    }
    
    function drag(e) {
        if(!isDragging) return;
        
        const gameContainerRect = gameContainer.getBoundingClientRect();
        // Calculate the new position relative to the gameContainer
        const newLeft = e.clientX - gameContainerRect.left - dragOffsetX;
        const newTop = e.clientY - gameContainerRect.top - dragOffsetY;
        
        // Update the element's position
        signElement.style.left = `${newLeft}px`;
        signElement.style.top = `${newTop}px`;
        
        // Check if sign is over the target area
        checkTargetOverlap(newLeft, newTop); // x, y params are not actually used in checkTargetOverlap
        
        e.preventDefault();
    }
    
    function handleTouchMove(e) {
        if(!isDragging) return;
        
        const touch = e.touches[0];
        
        // Call the drag handler with the touch coordinates
        const touchEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault()
        };
        
        drag(touchEvent);
    }
    
    function endDrag(e) {
        if(!isDragging || isPlaced) return; // Do not proceed if not dragging or already placed
        isDragging = false;
        
        // Remove dragging class
        signElement.classList.remove('dragging');
        
        // Reset z-index after dragging ends
        setTimeout(() => {
            if (!isPlaced) { // Only reset z-index if not successfully placed
                signElement.style.zIndex = '6';
            }
        }, 100);
        
        // Check if sign is positioned correctly in the target area
        const signRect = signElement.getBoundingClientRect();
        const targetRect = targetArea.getBoundingClientRect();
        
        // If the sign is mostly within the target area
        if(isOverlapping(signRect, targetRect)) {
            placeSignCorrectly();
        } else {
            // Play drop sound
            playSound('drop');
        }
    }
    
    function checkTargetOverlap(x, y) {
        if (isPlaced) return; // Don't check overlap if sign already placed
        // Get the rectangles of the sign and target
        const signRect = signElement.getBoundingClientRect();
        const targetRect = targetArea.getBoundingClientRect();
        
        // Add a visual cue when hovering over the target area
        if(isOverlapping(signRect, targetRect)) {
            if(!targetArea.classList.contains('target-hover')) {
                targetArea.classList.add('target-hover');
                playSound('hover');
            }
        } else {
            targetArea.classList.remove('target-hover');
        }
    }
    
    function isOverlapping(rect1, rect2) {
        // Calculate overlap area
        const overlapArea = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)) *
                           Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
        
        // Calculate sign area
        const signArea = rect1.width * rect1.height;
        
        // If at least 50% of the sign is over the target area
        return (overlapArea / signArea) > 0.5;
    }
    
    function placeSignCorrectly() {
        if (isPlaced) return; // Prevent placing multiple times

        // Center the sign in the target area
        const targetRect = targetArea.getBoundingClientRect();
        const signRect = signElement.getBoundingClientRect();
        const gameContainerRect = gameContainer.getBoundingClientRect();
        
        // Calculate viewport-relative centered position for the sign's top-left
        const viewportCenterX = targetRect.left + (targetRect.width - signRect.width) / 2;
        const viewportCenterY = targetRect.top + (targetRect.height - signRect.height) / 2;

        // Convert viewport-relative position to gameContainer-relative position
        const finalSignLeft = viewportCenterX - gameContainerRect.left;
        const finalSignTop = viewportCenterY - gameContainerRect.top;
        
        // Position the sign
        signElement.style.left = `${finalSignLeft}px`;
        signElement.style.top = `${finalSignTop}px`;
        
        // After positioning, set the flag to prevent further dragging and interaction
        isPlaced = true; 
        signElement.style.zIndex = '6';
        signElement.style.cursor = 'default';
        
        // Add classes for animation
        signElement.classList.add('sign-placed');
        targetArea.classList.add('sign-placed');
        targetArea.classList.remove('target-hover'); // Remove hover effect
        
        // Animate the building windows (make them brighter)
        document.querySelectorAll('.building-window').forEach(window => {
            window.classList.add('window-light-on');
        });
        
        // Animate the store elements
        animateStoreElements();
        
        // Play success sound
        playSound('success');
        
        // Display success message - ensure it's visible
        const successMessage = document.getElementById('game-success-message');
        if(successMessage) {
            // Reset any previous state
            successMessage.style.opacity = '0';
            successMessage.style.transform = 'translate(-50%, -50%) scale(0.8)';
            
            // Show the message
            successMessage.style.display = 'block';
            
            // Trigger animation with slight delay for smooth transition
            setTimeout(() => {
                successMessage.style.opacity = '1';
                successMessage.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 50);
        }
        
        // Trigger confetti celebration
        startConfetti();
    }
    
    /**
     * Animate store elements when sign is placed
     */
    function animateStoreElements() {
        // Add animation to store windows
        document.querySelectorAll('.store-window').forEach(window => {
            window.classList.add('store-window-glow');
        });
        
        // Add animation to store name
        const storeName = document.querySelector('.store-name');
        if (storeName) {
            storeName.textContent = 'FLORIDA SIGN';
            storeName.classList.add('store-name-active');
        }
    }
    
    // Simple sound effects system
    function playSound(type) {
        // Skip sounds if no Web Audio API support
        if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') return;
        
        // Create audio context if it doesn't exist
        if (!window.gameAudioContext) {
            try {
                window.gameAudioContext = new (AudioContext || webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported in this browser');
                return;
            }
        }
        
        const context = window.gameAudioContext;
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Configure sound based on type
        switch(type) {
            case 'pickup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(330, context.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(550, context.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
                
            case 'drop':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(550, context.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(330, context.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
                break;
                
            case 'hover':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, context.currentTime);
                gainNode.gain.setValueAtTime(0.05, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.1);
                break;
                
            case 'success':
                // Play a success arpeggio
                playSuccessArpeggio();
                break;
                
            // 'reset' case for sound is no longer needed
        }
    }
    
    function playSuccessArpeggio() {
        if (!window.gameAudioContext) return;
        
        const context = window.gameAudioContext;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const noteLength = 0.1;
        
        notes.forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            gainNode.gain.setValueAtTime(0.15, context.currentTime + index * noteLength);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + (index + 1) * noteLength);
            
            oscillator.start(context.currentTime + index * noteLength);
            oscillator.stop(context.currentTime + (index + 1) * noteLength);
        });
    }
}

/**
 * Initialize animations for visual elements
 */
function initAnimations() {
    // Other animation initializations can go here
    randomWindowBlink(); // Keep this if you want random window blinking
    // createMultipleCars(); // Removed this line
}

/**
 * Randomly make windows blink/change brightness
 */
function randomWindowBlink() {
    const windows = document.querySelectorAll('.building-window');
    if(windows.length === 0) return;
    
    // Don't blink if sign is placed (windows stay bright)
    if(document.querySelector('.sign-placed')) return;
    
    // Pick a random window
    const randomWindow = windows[Math.floor(Math.random() * windows.length)];
    
    // Add blink class
    randomWindow.classList.add('window-blink');
    
    // Remove after animation completes
    setTimeout(() => {
        randomWindow.classList.remove('window-blink');
    }, 500);
}

/**
 * Confetti animation
 * Based on a simplified version of canvas-confetti
 */
let confettiCanvas, confettiContext;
let confettiAnimationId;
const particles = [];
const particleCount = 200;

function startConfetti() {
    // If there's an existing animation, stop it first
    stopConfetti();
    
    // Create canvas for confetti
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.width = '100%';
    confettiCanvas.style.height = '100%';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '9999';
    document.body.appendChild(confettiCanvas);
    
    // Set canvas size
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    // Get context for drawing
    confettiContext = confettiCanvas.getContext('2d');
    
    // Create particles
    createParticles();
    
    // Start animation
    animateConfetti();
}

function createParticles() {
    // Clear existing particles
    particles.length = 0;
    
    // Create new particles
    for(let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * -confettiCanvas.height,
            width: Math.random() * 10 + 5,
            height: Math.random() * 6 + 4,
            speed: Math.random() * 5 + 2,
            angle: Math.random() * 6.28,
            rotation: Math.random() * 6.28,
            rotationSpeed: Math.random() * 0.2 - 0.1,
            color: getRandomColor(),
            // Add some shape variety
            shape: Math.random() > 0.5 ? 'rect' : 'circle'
        });
    }
}

function getRandomColor() {
    // Brand colors + some bright festive colors
    const colors = [
        '#3498db', // Primary blue
        '#e74c3c', // Red
        '#2ecc71', // Green
        '#f39c12', // Orange
        '#9b59b6', // Purple
        '#ffee58', // Yellow
        '#4db6ac', // Teal
        '#ff80ab', // Pink
        '#ffd700', // Gold
        '#00bcd4'  // Cyan
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
}

function animateConfetti() {
    // Clear canvas
    confettiContext.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    // Update and draw particles
    for(let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Update position
        p.y += p.speed;
        p.x += Math.sin(p.angle) * 2;
        
        // Update rotation
        p.rotation += p.rotationSpeed;
        
        // Draw particle based on shape
        confettiContext.save();
        confettiContext.translate(p.x, p.y);
        confettiContext.rotate(p.rotation);
        confettiContext.fillStyle = p.color;
        
        if(p.shape === 'rect') {
            // Rectangle
            confettiContext.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else {
            // Circle
            confettiContext.beginPath();
            confettiContext.arc(0, 0, p.width / 2, 0, Math.PI * 2);
            confettiContext.fill();
        }
        
        confettiContext.restore();
        
        // Reset particle if it goes off screen
        if(p.y > confettiCanvas.height) {
            p.y = Math.random() * -100;
            p.x = Math.random() * confettiCanvas.width;
        }
    }
    
    // Continue animation
    confettiAnimationId = requestAnimationFrame(animateConfetti);
    
    // Stop after 8 seconds (more festive!)
    setTimeout(stopConfetti, 8000);
}

function stopConfetti() {
    // Stop animation
    if(confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
    
    // Remove canvas
    if(confettiCanvas) {
        try {
            document.body.removeChild(confettiCanvas);
        } catch (e) {
            // console.warn('Canvas already removed or other error');
        }
        confettiCanvas = null;
    }
    
    // Clear particles array
    particles.length = 0;
} 