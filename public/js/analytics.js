let salesChart = null;
const buttons = document.querySelectorAll(".period-btn");

function cell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    return td;
}

function renderProductTable(products) {
    const body = document.getElementById("productStatsBody");
    body.replaceChildren();

    if (!products.length) {
        const tr = document.createElement("tr");
        const td = cell("No paid orders in this period.");
        td.colSpan = 5;
        tr.appendChild(td);
        body.appendChild(tr);
        return;
    }

    products.forEach((p) => {
        const tr = document.createElement("tr");
        tr.append(
            cell(p.name),
            cell(p.orders),
            cell(p.unitsSold),
            cell("₹" + Number(p.revenue).toFixed(2)),
            cell(p.stock === null ? "Deleted" : p.stock < 1 ? "Out of stock" : p.stock)
        );
        body.appendChild(tr);
    });
}

async function loadAnalytics(period = "7days") {
    try {
        const response = await fetch(`/admin/analytics/data?period=${period}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Analytics failed");
        }

        document.getElementById("totalRevenue").textContent = "₹" + Number(data.totalRevenue).toFixed(2);
        document.getElementById("totalOrders").textContent = data.totalOrders;
        document.getElementById("totalProductsSold").textContent = data.totalProductsSold;
        document.getElementById("averageOrderValue").textContent = "₹" + Number(data.averageOrderValue).toFixed(2);

        renderProductTable(data.products);

        const labels = data.sales.map((item) => item.id);
        const revenue = data.sales.map((item) => item.revenue);

        const ctx = document.getElementById("salesChart").getContext("2d");

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: "line",
            data: {
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
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error(error);
        alert("Unable to load analytics.");
    }
}

buttons.forEach((button) => {
    button.addEventListener("click", () => {
        buttons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        loadAnalytics(button.dataset.period);
    });
});

loadAnalytics("7days");