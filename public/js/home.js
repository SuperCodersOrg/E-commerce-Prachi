const load_more = document.getElementById("load-more");
const product_grid = document.querySelector(".product-grid");

load_more.addEventListener("click", async()=>{
    
    try {

        const lastId = load_more.dataset.nextCursor;

        if(!lastId){
            return;
        }

        const response = await fetch (`/home?lastId=${encodeURIComponent(lastId)}`);

        if(!response.ok) {
            throw new Error('Failed to load products');
        }
        const data = await response.json();

        data.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');

            const img = document.createElement('img');
            img.src = `/${product.image.replace(/^public\//,'')}`;
            img.alt = product.name;

            const link = document.createElement('a');
            link.href = `/home/products/${product._id}`;
            link.textContent = 'View Details';

            productCard.appendChild(img);
            productCard.appendChild(link);

            product_grid.appendChild(productCard);
        });

        load_more.dataset.nextCursor = data.nextCursor || '';

        if(!data.hasMore || !data.nextCursor){
            load_more.hidden = true;
        }
    }
    catch(error){
        console.log('Error loading more products:', error);
    }

});