
document.addEventListener("click", async (event) => {
    const addToCart = event.target.closest('#addToCart');

    if (!addToCart) return;
    event.preventDefault();

    const p_id = addToCart.dataset.productid;
    console.log("frontend ", p_id);

    const response = await fetch(`/home/cart/${p_id}`, {
        method: 'POST',
        headers: {
            Accept: "application/json"
        }
    })
 
    const data = await response.json();

    // console.log("Status:", response.status);
    // console.log("Server response:", data);

    if (response.status == 401 && data.userNotLogin) {

        let userLocalData = JSON.parse(localStorage.getItem('userLocalData') || '[]');

        // const existingData = userLocalData.find((itm) => itm.productId == p_id);
        // console.log(existingData);
        // if (existingData) {

        //     existingData.quantity++;
        // }
        // else {
        //     userLocalData.push({
        //         productId: p_id,
        //         quantity: 1,
        //     });

        if(!Array.isArray(userLocalData)){
            userLocalData = [];
        }

        const existingData = userLocalData.find((itm) => itm.productId == p_id);
        console.log(existingData);
        if (existingData) {

            existingData.quantity += 1;
        }
        else {
            userLocalData.push({
                productId: p_id,
                quantity: 1,
            });
        
        }

        localStorage.setItem('userLocalData', JSON.stringify(userLocalData));

        alert("Product added to your guest cart!");

        // window.location.href = '/auth/signin';
        return;
    }

    if (!response.ok) {
        alert(data.message || "Unable to add product");
        return;
    }

    // localStorage.removeItem('userLocalData');
    // window.location.href = '/home/cart';
    // return;

});

async function merge(){
    const savedProduct = localStorage.getItem("userLocalData");

    if(!savedProduct) return;

    let cart;

    cart = JSON.parse(savedProduct);

    if(!Array.isArray(cart) || cart.length == 0){
        localStorage.removeItem("userLocalData");
        return;
    }
    try{

        const response = await fetch('/home/cart/merge',{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            credentials: "same-origin",
            body: JSON.stringify({ cart })
        })

        const data = await response.json();
        if (!response.ok) {
           
            console.log("Cart not merged:", data.message);
            return;
        }

        // const existingData = cart.find(item => item.productId == productId);

        // if(existingData){
        //     existingData.quantity++;

        // }
        // else{
        //     cart.push({
        //         productId: productId,
        //             quantity: 1
        //     })
        // }
         localStorage.removeItem("userLocalData");
         window.location.href = '/home/cart';

    }
    catch(error){
        console.log("cart merge",error);
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    const isLogin = document.body.dataset.authenticated === "true";
    if (isLoggedIn) {
        merge();
    }
});

