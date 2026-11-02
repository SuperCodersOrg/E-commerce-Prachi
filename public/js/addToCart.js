const GUEST_KEY = "userLocalData";

function isLoggedIn() {
    return document.body.dataset.authenticated === "true";
}

function getGuestCart() {
    try {
        const cart = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
        return Array.isArray(cart) ? cart : [];
    } catch (error) {
        console.error("Invalid guest cart:", error);
        return [];
    }
}

function saveGuestCart(cart) {
    localStorage.setItem(GUEST_KEY, JSON.stringify(cart));
}

async function api(url, method, body) {
    const response = await fetch(url, {
        method,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
    });
    let data = {};
    try { data = await response.json(); } catch (e) { /* no json body */ }
    return { ok: response.ok, status: response.status, data };
}

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".add-to-cart");
    if (!button) return;
    event.preventDefault();

    const productId = button.dataset.productId;
    const stock = Number(button.dataset.stock);

    if (!productId) {
        alert("Product ID is missing.");
        return;
    }
    if (button.dataset.loading === "true") return;
    button.dataset.loading = "true";

    try {
        if (!isLoggedIn()) {
            const cart = getGuestCart();
            const existing = cart.find((item) => item.productId === productId);
            const newQty = (existing ? existing.quantity : 0) + 1;

            if (Number.isFinite(stock) && newQty > stock) {
                alert(`Only ${stock} item(s) available in stock.`);
                return;
            }

            if (existing) existing.quantity = newQty;
            else cart.push({ productId, quantity: 1 });

            saveGuestCart(cart);
            alert("Product added to your cart. Log in to save it to your account.");
            return;
        }

        const { ok, data } = await api(`/home/cart/${encodeURIComponent(productId)}`, "POST", { quantity: 1 });
        alert(data.message || (ok ? "Product added to cart." : "Unable to add product."));
    } catch (err) {
        console.error("Add to cart error:", err);
        alert("Something went wrong. Please try again.");
    } finally {
        button.dataset.loading = "false";
    }
});

async function mergeGuestCart() {
    if (!isLoggedIn()) return false;

    const cart = getGuestCart();
    if (cart.length === 0) return false;

    try {
        const { ok, data } = await api("/home/cart/merge", "POST", { cart });
        if (!ok) {
            alert(data.message || "Unable to sync your guest cart.");
            return false;
        }
        localStorage.removeItem(GUEST_KEY);
        if (data.notes && data.notes.length) alert(data.notes.join("\n"));

        window.location.href = "/home/cart" + window.location.search;
        return true;
    } catch (err) {
        console.error("Guest cart merge error:", err);
    }
    return false;
}

function money(n) {
    return "₹" + (Math.round(n * 100) / 100);
}

function makeEl(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
}

function makeBtn(label, cls, productId, extra = {}) {
    const b = makeEl("button", label, cls);
    b.type = "button";
    b.dataset.productId = productId;
    Object.assign(b.dataset, extra);
    return b;
}

async function renderGuestCart() {
    const box = document.getElementById("guest-cart");
    if (!box) return;
    box.replaceChildren();

    const cart = getGuestCart();
    if (cart.length === 0) {
        box.append(makeEl("p", "Your cart is empty."));
        const a = makeEl("a", "Continue shopping"); a.href = "/home";
        box.append(a);
        return;
    }

    let products = [];
    try {
        const { data } = await api("/home/cart/guest-details", "POST", { ids: cart.map((i) => i.productId) });
        products = data.products || [];
    } catch (err) {
        box.append(makeEl("p", "Unable to load your cart. Please try again."));
        return;
    }

    const byId = new Map(products.map((p) => [p._id, p]));

    const cleaned = cart.filter((i) => byId.has(i.productId));
    if (cleaned.length !== cart.length) saveGuestCart(cleaned);

    if (cleaned.length === 0) {
        box.append(makeEl("p", "Your cart is empty."));
        return;
    }

    let total = 0;
    let hasProblem = false;

    cleaned.forEach((item) => {
        const p = byId.get(item.productId);
        const outOfStock = p.stock < 1;
        const tooMany = !outOfStock && item.quantity > p.stock;
        if (outOfStock || tooMany) hasProblem = true;
        else total += p.price * item.quantity;

        const card = makeEl("div", undefined, "product-card cart-item");
        card.append(makeEl("h2", p.name));

        if (p.image) {
            const img = document.createElement("img");
            img.src = "/" + p.image.replace(/^public\//, "");
            img.alt = p.name;
            img.width = 150;
            card.append(img);
        }

        card.append(makeEl("p", "Price: " + money(p.price)));

        if (outOfStock) {
            const alertP = makeEl("p", "Out of stock");
            alertP.setAttribute("role", "alert");
            card.append(alertP);
        } else {
            card.append(makeEl("p", `In stock (${p.stock} available)`));
            if (tooMany) {
                const alertP = makeEl("p", `Only ${p.stock} item(s) available. Please reduce the quantity.`);
                alertP.setAttribute("role", "alert");
                card.append(alertP);
            }
            const qty = makeEl("div", undefined, "qty-controls");
            qty.append(
                makeBtn("−", "qty-dec", p._id, { quantity: item.quantity, stock: p.stock }),
                makeEl("span", String(item.quantity), "qty-value"),
                makeBtn("+", "qty-inc", p._id, { quantity: item.quantity, stock: p.stock })
            );
            card.append(qty);
            card.append(makeEl("p", "Subtotal: " + money(p.price * item.quantity)));
        }

        card.append(makeBtn("Remove", "remove-item", p._id));
        box.append(card);
    });

    box.append(makeEl("h2", "Cart total: " + money(total)));

    const note = makeEl("p", hasProblem
        ? "Resolve stock issues before checking out."
        : "Log in or sign up to confirm your order.");
    box.append(note);

    if (!hasProblem) {
        const login = makeEl("a", "Log in to checkout");
        login.href = "/auth/login?next=checkout";
        box.append(login);
    }
}

document.addEventListener("click", async (event) => {
    const inc = event.target.closest(".qty-inc");
    const dec = event.target.closest(".qty-dec");
    const rem = event.target.closest(".remove-item");
    const btn = inc || dec || rem;
    if (!btn) return;

    const productId = btn.dataset.productId;
    const quantity = Number(btn.dataset.quantity);
    const stock = Number(btn.dataset.stock);

    if (!isLoggedIn()) {
        let cart = getGuestCart();
        const item = cart.find((i) => i.productId === productId);
        if (!item) return;

        if (rem) {
            cart = cart.filter((i) => i.productId !== productId);
        } else if (inc) {
            if (item.quantity + 1 > stock) {
                alert(`Only ${stock} item(s) available in stock.`);
                return;
            }
            item.quantity += 1;
        } else if (dec) {
            if (item.quantity <= 1) return;
            item.quantity -= 1;
        }
        saveGuestCart(cart);
        renderGuestCart();
        return;
    }

    try {
        let result;
        if (rem) {
            result = await api(`/home/cart/${encodeURIComponent(productId)}`, "DELETE");
        } else if (inc) {
            if (quantity + 1 > stock) {
                alert(`Only ${stock} item(s) available in stock.`);
                return;
            }
            result = await api(`/home/cart/${encodeURIComponent(productId)}`, "PATCH", { quantity: quantity + 1 });
        } else {
            if (quantity <= 1) return;
            result = await api(`/home/cart/${encodeURIComponent(productId)}`, "PATCH", { quantity: quantity - 1 });
        }

        if (!result.ok) {
            alert(result.data.message || "Unable to update your cart.");
            return;
        }
        window.location.reload();
    } catch (err) {
        console.error("Cart update error:", err);
        alert("Something went wrong. Please try again.");
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    if (isLoggedIn()) {
        const merging = await mergeGuestCart();

        const params = new URLSearchParams(window.location.search);
        if (!merging && params.get("checkout") === "1" && window.location.pathname === "/home/cart") {
            window.location.replace("/home/cart/confirm");
        }
    } else {
        renderGuestCart();
    }
});