
// document.addEventListener("click", async (event) => {
//     const addToCart = event.target.closest('#addToCart');

//     if (!addToCart) return;
//     event.preventDefault();

// // const productId = addToCart.dataset.product-id;
// const productId = addToCart.getAttribute("data-product-id");

//  console.log("frontend ", productId);

// // if(!productId){
// //     alert(`Product ID is missing`);
// //     return;
// // }

//     try{

//         addToCart.style.pointerEvents = 'none';
//     const response = await fetch(`/home/cart/${encodeURIComponent(productId)}`, {
//         method: 'POST',
//         headers: {
//             Accept: "application/json",
//             "Content-Type": "application/json"
//         },
//         body: JSON.stringify({ quantity:1 })
//     });
 
//     const data = await response.json();

//     if (response.status == 401 && data.userNotLogin) {

// //         let guestCart = [];

// //         try{
// //         let savedCart  = JSON.parse(localStorage.getItem('userLocalData') || '[]');


// //         guestCart = Array.isArray(savedCart) ? savedCart : [];

// //     }
// //    catch(err){

// //     console.error("Invalid guest cart:", err);
// //     guestCart = [];
// if (!response.ok) {
// alert('please log in to add this product to your cart');
// window.location.href = '/views/login.ejs';
// return;
// }
// alert(data.message || "Product added to cart successfully!");
//    }

//     //     const existingItem  = guestCart.find((itm) => itm.productId == productId);
//     //     console.log(existingItem);

//     //     if (existingItem) {

//     //         existingItem.quantity += 1;
//     //     }
//     //     else {
//     //         guestCart.push({
//     //             productId,
//     //             quantity: 1,
//     //         });
        
//     //     }

//     //     localStorage.setItem('userLocalData', JSON.stringify(guestCart));

//     //     alert("Product added to your guest cart!");

//     //     // window.location.href = '/auth/signin';
//     //     return;
//     // }

//     // if (!response.ok) {
//     //     alert(data.message || "Unable to add product");
//     //     return;
//     // }

//     // localStorage.removeItem('userLocalData');
//     // window.location.href = '/home/cart';
//     // return;
   
// }

//     catch(err)
// {

//     console.error('Add to cart error:', error);
//     alert('Something went wrong. Please try again.');

// }
// finally{
//     addToCart.style.pointerEvents = '';
// }
// });

// async function merge(){
//     const savedCart  = localStorage.getItem("userLocalData") || '[]';

//     if(!savedCart ) return;

//     let cart;

//     try{

//     cart = JSON.parse(savedCart);

//     }
//     catch(err){

//         console.error('Invalid guest cart data.');
//         return;

//     }

//     if(!Array.isArray(cart) || cart.length == 0){
//         localStorage.removeItem("userLocalData");
//         return;
//     }
//     try{

//         const response = await fetch('/home/cart/merge',{
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Accept: "application/json"
//             },
//             credentials: "same-origin",
//             body: JSON.stringify({ cart })
//         })

//         const data = await response.json();
//         if (!response.ok) {
           
//             console.log("Cart not merged:", data.message);
//             alert(data.message || "Unable to merge cart");
//             return;
//         }

//         // const existingData = cart.find(item => item.productId == productId);

//         // if(existingData){
//         //     existingData.quantity++;

//         // }
//         // else{
//         //     cart.push({
//         //         productId: productId,
//         //             quantity: 1
//         //     })
//         // }
//          localStorage.removeItem("userLocalData");
//          window.location.href = '/home/cart';

//     }
//     catch(error){
//         console.log("cart merge",error);
//     }
// }

// document.addEventListener("DOMContentLoaded",()=>{
//     const isLogin = document.body.dataset.authenticated  === 'true';
//     if (isLogin) {
//         merge();
//     }
// });


function getGuestcart(){

    try{

        const cart = JSON.parse(localStorage.getItem(userLocalData) || '[]');

        return Array.isArray(cart) ? cart: [];

    }
    catch(error){

        console.error("Invalid guest cart:", err);
        return [];

    }
  
}

function saveGuestCart(cart){
    localStorage.setItem("userLocalData",JSON.stringify(cart));
}

document.addEventListener("click", async(event)=>{
    const button = event.target.closest("#addToCart");

    if(!button) return ;

    event.preventDefault();

    const productId = button.getAttribute("data-product-id");

    if (!productId) {
        alert("Product ID is missing.");
        return;
    }

    if(button.dataset.loading === "true") return;

    button.dataset.loading = "true";
    button.style.pointerEvents = "none";

    try{
        const isLoggedIn = document.body.dataset.authenticated === "true";

        if(!isLoggedIn){
            const cart = guestCart();
            const existingItem = cart.find(
                item => item.productId === productId
            );

            if(existingItem){
                existingItem.quantity += 1;

            }
            else{
                cart.push({
                    productId,
                    quantity: 1
                });
            }
            saveGuestCart(cart);
            alert("Product added to your cart. Sign in to sync it.");
            return;
        }

        const response = await fetch(`/home/crat/${encodeURIComponent(productId)}`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({quantity: 1})
        }
    );

    const data = await response.json();
    if(!reswponse.ok){
        alert(data.message || "Unable to add product.");
            return;
    }
    alert(data.message || "Product added to cart.");

    }
    catch(err){

        console.error("Add to cart error:", err);
        alert("Something went wrong. Please try again.");

    }
    finally{
        button.dataset.loading = "false";
        button.style.pointerEvents = "";
    }
});


async function mergeGuestCart(){
    if(document.body.dataset.authenticated !== "true"){
        return ; 
    }

    const cart = getGuestCart();

    if(cart.length == 0) return ;

    try {
        const response = await fetch("/home/cart/merge",{
            method: "POST",
            headers:{
                Accept:"application/json",
                "Content-Type": "application/json"
            }
            ,body: JSON.stringify({ cart })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Unable to sync your guest cart.");
            return;
        }

        localStorage.removeItem("userLocalData");

        if(window.location.pathname != "/home/cart"){
            window.location.href = "/home/cart";
        }
    }
    catch(err){
        console.error("Guest cart merge error:", err);
    }

    document.addEventListener("DOMContentLoaded", () => {

    mergeGuestCart();

        });
}