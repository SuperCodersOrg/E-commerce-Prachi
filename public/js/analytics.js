
let salesChart = null;
const buttons = documents.querrySelectorAll(".period-btn");

async function loadAnalytics(period = "7days"){
    try{
        const response = await fetch(`/admin/analytics/data?period=${period}`);

        const data = await response.json();

        if(!response.ok || !data.success){
            throw new Error(data.message || "Analytics field");
        }
        document.getElementById("totalRevenue").textContent = "₹" + Number(data.totalRevenue).toFixed(2);

        document.getElementById("totalOrders").textContent = data.totalOrders;

        document.getElementById("totalProductsSold").textContent = data.totalProductsSold;

        document.getElementById("averageOrderValue").textContent = "₹" + Number(data.averageOrderValue).toFixed(2);

        const labels = data.sales.map(item => item.id);
        const revenue = data.sales.map(item => item.revenue);

        const ctx = document.getElementById("salesChart").getContext("2d");

        if(salesChart){
            salesChart.destroy();
        }
        salesChart = new Chart (ctx,{
            type: "line",

            data:{
                labels,
                datasets: [
                    {
                    label: "Revenue (₹)",
                    data: revenue,
                    borderColor: "#49372D",
                    backgroundColor: "rgba(73, 55, 45, 0.1)",
                    fill: true,
                    tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                sales: {
                     y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    catch(err){
        console.error(error);
        alert("Unable to load analytics.");
    }
}
buttons.forEach(button => {
    button.addEventListener("click", () => {

        buttons.forEach(btn =>
            btn.classList.remove("active")
        );

        button.classList.add("active");

        loadAnalytics(button.dataset.period);
    });
});

loadAnalytics("7days");