
document.addEventListener("click",async(event)=>{
    const addToCart = event.target.closest('#addToCart');

    if(!addToCart) return ;
    event.preventDefault();

    const p_id = addToCart.dataset.productId;
    console.log("frontend ",p_id);

    const response = await fetch(`/home/cart/${p_id}`,{
        method: 'POST',
         headers: {
                Accept: "application/json"
            }})
   
    const data = await response.json(); 


    if(response.status == 401 && data.userNotLogin){

        let userLocalData = JSON.parse(localStorage.getItem('userLocalData') || "[]");

    }

    const existingData = userLocalData.find((itm)=> itm.productId == p_id);
    console.log(existingData);
    if(existingData){

    existingData.quantity++;        
    }
    else{
        userLocalData.push({productId: p_id,
            quantity: 1,
        });
    }

    localStorage.setItem('userLocalData',JSON.stringify(userLocalData));

     alert("Product added to your guest cart!");

      if(!response.ok){
        alert(data.message || "Unable to add product");
            return;
    }

    
    return;

    
})

