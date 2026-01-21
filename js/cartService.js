const CART_KEY = "cart";

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || {
    items: [],
    total: 0
  };
}

export function saveCart(cart) {
  cart.total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(product) {
  const cart = getCart();
  const existing = cart.items.find(
    i => i.productId === product.productId && i.size === product.size
  );

  if (existing) {
    existing.quantity += product.quantity;
  } else {
    cart.items.push(product);
  }

  saveCart(cart);
}

export function removeFromCart(productId, size) {
  const cart = getCart();
  cart.items = cart.items.filter(
    i => !(i.productId === productId && i.size === size)
  );
  saveCart(cart);
}

export function updateQuantity(productId, size, qty) {
  const cart = getCart();
  const item = cart.items.find(
    i => i.productId === productId && i.size === size
  );
  if (item) item.quantity = qty;
  saveCart(cart);
}

export function updateCartBadge() {
  const cart = getCart();
  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(
    el => el.textContent = count
  );
}
