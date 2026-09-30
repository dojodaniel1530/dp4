document.addEventListener('DOMContentLoaded', () => {
    let scheduleData = {};
    const gridContainer = document.getElementById('schedule-grid');
    const filterButtons = document.querySelectorAll('.day-tab-btn');

    // Fetch JSON Data
    fetch('assets/js/schedule.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load JSON schedule');
            return response.json();
        })
        .then(data => {
            scheduleData = data;
            renderSchedule('monday');
        })
        .catch(error => {
            console.error('Error fetching schedule:', error);
            if (gridContainer) {
                gridContainer.innerHTML = '<p>Unable to load schedule at this time.</p>';
            }
        });

    // Render cards to the grid
    function renderSchedule(day) {
        if (!gridContainer) return;
        gridContainer.innerHTML = ''; 

        const dayShows = scheduleData[day] || [];

        if (dayShows.length === 0) {
            gridContainer.innerHTML = '<p>No shows scheduled for this day.</p>';
            return;
        }

        dayShows.forEach(show => {
            const isAd = show.title === 'Advertisement';

            const mediaContent = isAd ? `
                <div class="ad-container" data-fallback-img="${show.img || 'images/ads.webp'}" data-fallback-link="${show.link || '#'}" style="min-height: 250px;">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-7239298647673410"
                         data-ad-slot="3287216264"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>
            ` : `
                <a href="${show.link}" class="image fit" target="_blank" rel="noopener noreferrer">
                    <img src="${show.img}" alt="${show.title}" loading="lazy">
                </a>
            `;

            const timeBlock = show.time ? `
                <div class="time-block">
                    <strong>Featured Time:</strong><br>${show.time}
                </div>
            ` : '';

            const cardHTML = `
                <div class="col-4 col-6-medium col-12-small schedule-card ${isAd ? 'ad-card' : ''}" data-day="${day}">
                    ${mediaContent}
                    <div class="album-info">
                        <h3>${show.title}</h3>
                        ${timeBlock}
                    </div>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        // Initialize AdSense with fallback detection
        gridContainer.querySelectorAll('.ad-container').forEach(container => {
            const ins = container.querySelector('.adsbygoogle');
            if (!ins) return;

            const applyFallback = () => {
                if (container.dataset.hasFallenBack) return;
                container.dataset.hasFallenBack = 'true';
                
                const fallbackImg = container.getAttribute('data-fallback-img');
                const fallbackLink = container.getAttribute('data-fallback-link');

                container.innerHTML = `
                    <a href="${fallbackLink}" class="image fit" target="_blank" rel="noopener noreferrer">
                        <img src="${fallbackImg}" alt="Advertisement" loading="lazy">
                    </a>
                `;
            };

            // 1. Trigger AdSense; fallback if script fails or is blocked
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                applyFallback();
                return;
            }

            // 2. Watch for AdSense returning an "unfilled" status
            const observer = new MutationObserver(() => {
                if (ins.getAttribute('data-ad-status') === 'unfilled') {
                    observer.disconnect();
                    applyFallback();
                }
            });
            observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

            // 3. Timeout fallback for ad blockers that silently suppress network requests
            setTimeout(() => {
                observer.disconnect();
                if (ins.getAttribute('data-ad-status') === 'unfilled' || ins.children.length === 0) {
                    applyFallback();
                }
            }, 2500);
        });
    }

    // Handle day filter button clicks
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const selectedDay = button.getAttribute('data-day');
            renderSchedule(selectedDay);
        });
    });
});