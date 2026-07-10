// use native fetch

(async () => {
    try {
        const res = await fetch('http://localhost:5000/api/hero-banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Banner',
                show_id: '4', // assuming show 4 exists
                sorting_position: 1,
                image: 'https://placehold.co/1200x600'
            })
        });
        const data = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error(e);
    }
})();
