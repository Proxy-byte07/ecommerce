/**
 * ApexCommerce & Inventory Management Single-Page Application (SPA)
 * Frontend Application logic & REST API Client
 */

class ApexApp {
  constructor() {
    this.apiBase = "/api/v1";
    this.token = localStorage.getItem("apex_jwt_token") || null;
    this.currentUser = JSON.parse(localStorage.getItem("apex_user") || "null");

    this.products = [];
    this.cart = { items: [], subtotal: 0, totalItems: 0 };
    this.orders = [];
    this.auditLogs = [];
    this.allAdminOrders = [];

    this.activeTab = "catalog";
    this.activeAdminSubtab = "stock";

    this.searchQuery = "";
    this.selectedCategory = "";
    this.auditTypeFilter = "";
    this.authMode = "login";

    this.init();
  }

  async init() {
    this.updateUserUI();

    // Verify token validity if logged in
    if (this.token) {
      try {
        const meRes = await this.apiCall("/auth/me");
        if (meRes.success) {
          this.currentUser = meRes.data.user;
          localStorage.setItem("apex_user", JSON.stringify(this.currentUser));
          this.updateUserUI();
          this.loadCart();
        } else {
          this.logout();
        }
      } catch (err) {
        console.warn("Auth token expired or invalid. Resetting state.");
        this.logout();
      }
    }

    await this.loadProducts();
  }

  // ─── API Client Helper ──────────────────────────────────────────────────
  async apiCall(endpoint, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status} Error`);
      }

      return data;
    } catch (error) {
      console.error(`API Request Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ─── Toast Notifications ────────────────────────────────────────────────
  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ─── User & Navigation State ───────────────────────────────────────────
  updateUserUI() {
    const userRoleTag = document.getElementById("user-role-tag");
    const userNameDisplay = document.getElementById("user-name-display");
    const adminTabBtn = document.getElementById("tab-btn-admin");
    const logoutBtn = document.getElementById("logout-btn");

    if (this.currentUser) {
      userRoleTag.textContent = this.currentUser.role.toUpperCase();
      userRoleTag.className = `role-chip ${this.currentUser.role}`;
      userNameDisplay.textContent = this.currentUser.name;
      if (logoutBtn) logoutBtn.style.display = "inline-flex";

      if (this.currentUser.role === "admin") {
        adminTabBtn.style.display = "inline-flex";
      } else {
        adminTabBtn.style.display = "none";
        if (this.activeTab === "admin") this.switchTab("catalog");
      }
    } else {
      userRoleTag.textContent = "GUEST";
      userRoleTag.className = "role-chip guest";
      userNameDisplay.textContent = "Sign In";
      if (logoutBtn) logoutBtn.style.display = "none";
      adminTabBtn.style.display = "none";
      if (this.activeTab === "admin") this.switchTab("catalog");
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update Nav Buttons
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) activeBtn.classList.add("active");

    // Update View Sections
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) activeView.classList.add("active");

    if (tabName === "catalog") this.loadProducts();
    if (tabName === "orders") this.loadCustomerOrders();
    if (tabName === "admin") this.loadAdminData();
  }

  switchAdminSubtab(subtab) {
    this.activeAdminSubtab = subtab;
    document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(`admin-subtab-${subtab}`).classList.add("active");

    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`admin-panel-${subtab}`).classList.add("active");

    if (subtab === "stock") this.renderAdminStockTable();
    if (subtab === "audit") this.loadAuditLogs();
    if (subtab === "orders") this.loadAdminOrders();
  }

  // ─── Authentication Handlers ────────────────────────────────────────────
  openAuthModal() {
    if (this.currentUser) {
      // User is already logged in -> prompt logout or profile
      if (confirm(`Logged in as ${this.currentUser.name} (${this.currentUser.email}). Do you want to sign out?`)) {
        this.logout();
      }
      return;
    }
    document.getElementById("auth-modal").classList.add("active");
  }

  closeAuthModal() {
    document.getElementById("auth-modal").classList.remove("active");
  }

  toggleAuthMode(mode) {
    this.authMode = mode;
    const isReg = mode === "register";
    document.getElementById("auth-tab-login").classList.toggle("active", !isReg);
    document.getElementById("auth-tab-register").classList.toggle("active", isReg);
    document.getElementById("register-fields").style.display = isReg ? "block" : "none";
    document.getElementById("auth-submit-btn").textContent = isReg ? "Create Account" : "Sign In";
  }

  async quickLogin(preset) {
    const email = preset === "admin" ? "admin@ecommerce.com" : "customer@ecommerce.com";
    const password = preset === "admin" ? "AdminSecret123!" : "CustomerSecret123!";

    try {
      const res = await this.apiCall("/auth/login", "POST", { email, password });
      this.token = res.data.token;
      this.currentUser = res.data.user;

      localStorage.setItem("apex_jwt_token", this.token);
      localStorage.setItem("apex_user", JSON.stringify(this.currentUser));

      this.updateUserUI();
      this.loadCart();
      this.closeAuthModal();
      this.showToast(`Logged in successfully as ${this.currentUser.name} (${this.currentUser.role.toUpperCase()})`, "success");

      if (this.currentUser.role === "admin") {
        this.switchTab("admin");
      } else {
        this.switchTab("catalog");
      }
    } catch (err) {
      this.showToast(`Quick login failed: ${err.message}`, "error");
    }
  }

  async handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value.trim();

    try {
      let res;
      if (this.authMode === "register") {
        const name = document.getElementById("auth-name").value.trim();
        const role = document.getElementById("auth-role").value;
        res = await this.apiCall("/auth/register", "POST", { name, email, password, role });
        this.showToast("Account created successfully! Please sign in.", "success");
        this.toggleAuthMode("login");
        return;
      } else {
        res = await this.apiCall("/auth/login", "POST", { email, password });
      }

      this.token = res.data.token;
      this.currentUser = res.data.user;

      localStorage.setItem("apex_jwt_token", this.token);
      localStorage.setItem("apex_user", JSON.stringify(this.currentUser));

      this.updateUserUI();
      this.loadCart();
      this.closeAuthModal();
      this.showToast(`Welcome back, ${this.currentUser.name}!`, "success");
    } catch (err) {
      this.showToast(`Auth error: ${err.message}`, "error");
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem("apex_jwt_token");
    localStorage.removeItem("apex_user");
    this.cart = { items: [], subtotal: 0, totalItems: 0 };
    this.renderCartUI();
    this.updateUserUI();
    this.showToast("Logged out successfully.", "info");
    this.switchTab("catalog");
  }

  // ─── Products & Catalog ─────────────────────────────────────────────────
  async loadProducts() {
    try {
      let query = "?";
      if (this.selectedCategory) query += `category=${encodeURIComponent(this.selectedCategory)}&`;
      if (this.searchQuery) query += `search=${encodeURIComponent(this.searchQuery)}&`;

      const res = await this.apiCall(`/products${query}`);
      this.products = res.data.products || [];

      this.renderCatalog();
      this.updateHeroStats();
    } catch (err) {
      console.error("Failed to load products:", err);
      const grid = document.getElementById("product-grid");
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 2.5rem; background: #fff5f5; border-radius: 12px; border: 1px solid #feb2b2;">
            <h3 style="color: #c53030; margin-bottom: 0.5rem;">⚠️ Database Connection Action Required</h3>
            <p style="color: #742a2a; margin-bottom: 0.75rem;">${err.message}</p>
            <p style="color: #4a5568; font-size: 0.9rem;">To resolve: Go to your <strong>Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables</strong>, add <code>MONGODB_URI</code> (e.g. from MongoDB Atlas), and set Atlas IP Access to <code>0.0.0.0/0</code>.</p>
          </div>
        `;
      }
      this.showToast(err.message || "Could not load products", "error");
    }
  }

  updateHeroStats() {
    document.getElementById("stat-product-count").textContent = this.products.length;
    const lowStockCount = this.products.filter(p => p.stockQuantity <= p.minStockThreshold).length;
    document.getElementById("stat-low-stock-count").textContent = lowStockCount;
  }

  handleSearchInput(val) {
    this.searchQuery = val.trim();
    this.loadProducts();
  }

  filterCategory(cat) {
    this.selectedCategory = cat;
    document.querySelectorAll("#category-pills .pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-category") === cat);
    });
    this.loadProducts();
  }

  renderCatalog() {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = "";

    if (this.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <h3>No matching products found</h3>
          <p style="color: #64748b; margin-top: 0.5rem;">Try adjusting your search terms or category filter.</p>
        </div>
      `;
      return;
    }

    this.products.forEach(prod => {
      let stockStatusClass = "in-stock";
      let stockText = `${prod.stockQuantity} in stock`;

      if (prod.stockQuantity === 0) {
        stockStatusClass = "out-of-stock";
        stockText = "Out of Stock";
      } else if (prod.stockQuantity <= prod.minStockThreshold) {
        stockStatusClass = "low-stock";
        stockText = `Low Stock (${prod.stockQuantity} left)`;
      }

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="card-top">
          <span class="sku-badge">${prod.sku}</span>
          <span class="stock-tag ${stockStatusClass}">${stockText}</span>
        </div>
        <h3 class="product-title">${prod.title}</h3>
        <p class="product-desc">${prod.description}</p>
        <div class="card-footer">
          <span class="product-price">$${prod.price.toFixed(2)}</span>
          <button class="btn-add-cart" ${prod.stockQuantity === 0 ? "disabled" : ""} onclick="app.addToCart('${prod._id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add to Cart
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // ─── Cart Management ────────────────────────────────────────────────────
  toggleCartDrawer(open = null) {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-drawer-overlay");

    const shouldOpen = open !== null ? open : !drawer.classList.contains("active");

    if (shouldOpen) {
      drawer.classList.add("active");
      overlay.classList.add("active");
    } else {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    }
  }

  async loadCart() {
    if (!this.token) return;
    try {
      const res = await this.apiCall("/cart");
      if (res.success && res.data && res.data.cart) {
        this.cart = res.data.cart;
        this.renderCartUI();
      }
    } catch (err) {
      console.warn("Error fetching cart:", err.message);
    }
  }

  async addToCart(productId) {
    if (!this.token) {
      this.openAuthModal();
      this.showToast("Please sign in to add items to cart", "info");
      return;
    }

    try {
      const res = await this.apiCall("/cart/items", "POST", { productId, quantity: 1 });
      this.cart = res.data.cart;
      this.renderCartUI();
      this.showToast("Item added to cart!", "success");
      this.toggleCartDrawer(true);
    } catch (err) {
      this.showToast(`Cannot add item: ${err.message}`, "error");
    }
  }

  async updateCartQuantity(productId, newQty) {
    if (newQty <= 0) {
      return this.removeCartItem(productId);
    }

    try {
      const res = await this.apiCall(`/cart/items/${productId}`, "PUT", { quantity: newQty });
      this.cart = res.data.cart;
      this.renderCartUI();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  async removeCartItem(productId) {
    try {
      const res = await this.apiCall(`/cart/items/${productId}`, "DELETE");
      this.cart = res.data.cart;
      this.renderCartUI();
      this.showToast("Item removed from cart", "info");
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  renderCartUI() {
    const countBadge = document.getElementById("cart-count-badge");
    const container = document.getElementById("cart-items-container");
    const subtotalEl = document.getElementById("cart-subtotal");

    const totalCount = this.cart.items ? this.cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
    countBadge.textContent = totalCount;

    subtotalEl.textContent = `$${(this.cart.subtotal || 0).toFixed(2)}`;

    if (!this.cart.items || this.cart.items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem 0; color: #64748b;">
          <p>Your shopping cart is empty.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = "";
    this.cart.items.forEach(item => {
      const prod = item.product || {};
      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";
      itemEl.innerHTML = `
        <div class="cart-item-info">
          <h4>${prod.title || "Product"}</h4>
          <span class="cart-item-price">$${(item.price || 0).toFixed(2)} each</span>
        </div>
        <div class="quantity-controls">
          <button class="qty-btn" onclick="app.updateCartQuantity('${prod._id}', ${item.quantity - 1})">-</button>
          <span style="font-weight: 700; font-size: 0.9rem;">${item.quantity}</span>
          <button class="qty-btn" onclick="app.updateCartQuantity('${prod._id}', ${item.quantity + 1})">+</button>
        </div>
      `;
      container.appendChild(itemEl);
    });
  }

  async handleCheckout() {
    if (!this.token) {
      this.openAuthModal();
      return;
    }

    if (!this.cart.items || this.cart.items.length === 0) {
      this.showToast("Your cart is empty!", "error");
      return;
    }

    const street = document.getElementById("ship-street").value.trim();
    const city = document.getElementById("ship-city").value.trim();
    const state = document.getElementById("ship-state").value.trim();
    const zipCode = document.getElementById("ship-zip").value.trim();
    const paymentMethod = document.getElementById("ship-payment").value;

    if (!street || !city || !state || !zipCode) {
      this.showToast("Please complete all shipping address fields", "error");
      return;
    }

    try {
      const res = await this.apiCall("/orders/checkout", "POST", {
        shippingAddress: { street, city, state, zipCode, country: "US" },
        paymentMethod
      });

      this.showToast(`🎉 Order ${res.data.order.orderNumber} placed successfully!`, "success");
      this.cart = { items: [], subtotal: 0, totalItems: 0 };
      this.renderCartUI();
      this.toggleCartDrawer(false);
      this.loadProducts(); // Refresh stock counts
      this.switchTab("orders");
    } catch (err) {
      this.showToast(`Checkout failed: ${err.message}`, "error");
    }
  }

  // ─── Customer Orders ───────────────────────────────────────────────────
  async loadCustomerOrders() {
    if (!this.token) {
      document.getElementById("customer-orders-container").innerHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3>Please Sign In</h3>
          <p style="color: #64748b; margin-bottom: 1rem;">Sign in to view your order history and live fulfillment tracking.</p>
          <button class="btn btn-primary" onclick="app.openAuthModal()">Sign In Now</button>
        </div>
      `;
      return;
    }

    try {
      const res = await this.apiCall("/orders/my-orders");
      this.orders = res.data.orders || [];
      this.renderCustomerOrders();
    } catch (err) {
      this.showToast(`Error loading orders: ${err.message}`, "error");
    }
  }

  renderCustomerOrders() {
    const container = document.getElementById("customer-orders-container");
    container.innerHTML = "";

    if (this.orders.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3>No Orders Found</h3>
          <p style="color: #64748b;">You haven't placed any orders yet.</p>
        </div>
      `;
      return;
    }

    this.orders.forEach(ord => {
      let statusColor = "#3b82f6";
      if (ord.orderStatus === "DELIVERED") statusColor = "#10b981";
      if (ord.orderStatus === "CANCELLED") statusColor = "#ef4444";
      if (ord.orderStatus === "PROCESSING") statusColor = "#f59e0b";

      const card = document.createElement("div");
      card.className = "table-card";
      card.style.padding = "1.5rem";
      card.style.marginBottom = "1rem";

      const canCancel = ["PENDING", "PROCESSING"].includes(ord.orderStatus);

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.75rem;">
          <div>
            <h4 style="font-size: 1.1rem; font-weight: 800;">Order #${ord.orderNumber}</h4>
            <span style="font-size: 0.8rem; color: #64748b;">Placed on ${new Date(ord.createdAt).toLocaleString()}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="background: ${statusColor}15; color: ${statusColor}; font-weight: 800; font-size: 0.75rem; padding: 4px 12px; border-radius: 99px;">
              ${ord.orderStatus}
            </span>
            ${canCancel ? `<button class="btn btn-danger" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;" onclick="app.cancelOrder('${ord._id}')">Cancel Order</button>` : ""}
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <span style="font-size: 0.8rem; font-weight: 700; color: #475569;">ITEMS PURCHASED:</span>
          <ul style="list-style: none; margin-top: 0.5rem;">
            ${ord.items.map(i => `<li style="font-size: 0.9rem; margin-bottom: 4px;">• <strong>${i.title}</strong> x ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}</li>`).join("")}
          </ul>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px;">
          <span>Shipping to: <strong>${ord.shippingAddress?.street}, ${ord.shippingAddress?.city}</strong></span>
          <span style="font-weight: 800; font-size: 1.1rem;">Total: $${ord.totalAmount.toFixed(2)}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  async cancelOrder(orderId) {
    if (!confirm("Are you sure you want to cancel this order? Item quantities will be restored back to product inventory.")) return;

    try {
      await this.apiCall(`/orders/${orderId}/cancel`, "POST", { reason: "Customer cancelled via Web Frontend" });
      this.showToast("Order cancelled & inventory restored successfully!", "success");
      this.loadCustomerOrders();
      this.loadProducts();
    } catch (err) {
      this.showToast(`Cannot cancel order: ${err.message}`, "error");
    }
  }

  // ─── Admin Dashboard ───────────────────────────────────────────────────
  loadAdminData() {
    if (!this.currentUser || this.currentUser.role !== "admin") {
      this.showToast("Access denied. Admin role required.", "error");
      this.switchTab("catalog");
      return;
    }

    if (this.activeAdminSubtab === "stock") this.renderAdminStockTable();
    if (this.activeAdminSubtab === "audit") this.loadAuditLogs();
    if (this.activeAdminSubtab === "orders") this.loadAdminOrders();
  }

  renderAdminStockTable() {
    const tbody = document.getElementById("admin-stock-tbody");
    tbody.innerHTML = "";

    this.products.forEach(p => {
      let statusBadge = `<span class="stock-tag in-stock">In Stock</span>`;
      if (p.stockQuantity === 0) statusBadge = `<span class="stock-tag out-of-stock">Out of Stock</span>`;
      else if (p.stockQuantity <= p.minStockThreshold) statusBadge = `<span class="stock-tag low-stock">Low Stock</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong style="display: block;">${p.title}</strong>
          <span style="font-size: 0.75rem; color: #64748b;">${p.sku}</span>
        </td>
        <td style="text-transform: capitalize;">${p.category}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td><strong style="font-size: 1rem;">${p.stockQuantity}</strong></td>
        <td>${p.minStockThreshold}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;" onclick="app.openAdjustModal('${p._id}', '${p.title.replace(/'/g, "\\'")}')">
            ⚙️ Adjust Stock
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  openAdjustModal(prodId, title) {
    document.getElementById("adjust-product-id").value = prodId;
    document.getElementById("adjust-product-title").value = title;
    document.getElementById("adjust-stock-modal").classList.add("active");
  }

  closeAdjustModal() {
    document.getElementById("adjust-stock-modal").classList.remove("active");
  }

  async handleStockAdjustment(e) {
    e.preventDefault();
    const prodId = document.getElementById("adjust-product-id").value;
    const quantityChange = parseInt(document.getElementById("adjust-quantity").value, 10);
    const reason = document.getElementById("adjust-reason").value.trim();

    try {
      await this.apiCall(`/inventory/adjust/${prodId}`, "POST", { quantityChange, reason });
      this.showToast("Inventory adjusted cleanly!", "success");
      this.closeAdjustModal();
      await this.loadProducts();
      this.renderAdminStockTable();
    } catch (err) {
      this.showToast(`Stock adjustment error: ${err.message}`, "error");
    }
  }

  // Admin Audit Logs
  filterAuditLogs(type) {
    this.auditTypeFilter = type;
    document.querySelectorAll("[data-audit-type]").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-audit-type") === type);
    });
    this.loadAuditLogs();
  }

  async loadAuditLogs() {
    try {
      let endpoint = "/inventory/audit-logs";
      if (this.auditTypeFilter) endpoint += `?type=${this.auditTypeFilter}`;
      const res = await this.apiCall(endpoint);
      this.auditLogs = res.data.logs || [];
      this.renderAuditTable();
    } catch (err) {
      this.showToast(`Error loading audit logs: ${err.message}`, "error");
    }
  }

  renderAuditTable() {
    const tbody = document.getElementById("admin-audit-tbody");
    tbody.innerHTML = "";

    if (this.auditLogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">No audit records found.</td></tr>`;
      return;
    }

    this.auditLogs.forEach(log => {
      const changeText = log.quantityChange > 0 ? `+${log.quantityChange}` : `${log.quantityChange}`;
      const changeColor = log.quantityChange > 0 ? "#10b981" : "#ef4444";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-size: 0.8rem; color: #64748b;">${new Date(log.createdAt).toLocaleString()}</td>
        <td><strong>${log.sku || "N/A"}</strong></td>
        <td><span style="font-weight: 700; font-size: 0.75rem; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${log.type}</span></td>
        <td><strong style="color: ${changeColor}">${changeText}</strong></td>
        <td>${log.previousStock} ➔ ${log.newStock}</td>
        <td style="font-size: 0.85rem;">${log.reason || "N/A"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Admin Manage All Customer Orders
  async loadAdminOrders() {
    try {
      const res = await this.apiCall("/orders");
      this.allAdminOrders = res.data.orders || [];
      this.renderAdminOrdersTable();
    } catch (err) {
      this.showToast(`Error loading admin orders: ${err.message}`, "error");
    }
  }

  renderAdminOrdersTable() {
    const tbody = document.getElementById("admin-orders-tbody");
    tbody.innerHTML = "";

    this.allAdminOrders.forEach(ord => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${ord.orderNumber}</strong></td>
        <td>${ord.user?.name || "Customer"} <br><span style="font-size: 0.75rem; color: #64748b;">${ord.user?.email || ""}</span></td>
        <td><strong>$${ord.totalAmount.toFixed(2)}</strong></td>
        <td>${ord.items.length} item(s)</td>
        <td><span class="role-chip customer">${ord.orderStatus}</span></td>
        <td>
          <select style="font-size: 0.8rem; padding: 2px 6px;" onchange="app.updateOrderStatusAdmin('${ord._id}', this.value)">
            <option value="PENDING" ${ord.orderStatus === "PENDING" ? "selected" : ""}>PENDING</option>
            <option value="PROCESSING" ${ord.orderStatus === "PROCESSING" ? "selected" : ""}>PROCESSING</option>
            <option value="SHIPPED" ${ord.orderStatus === "SHIPPED" ? "selected" : ""}>SHIPPED</option>
            <option value="DELIVERED" ${ord.orderStatus === "DELIVERED" ? "selected" : ""}>DELIVERED</option>
            <option value="CANCELLED" ${ord.orderStatus === "CANCELLED" ? "selected" : ""}>CANCELLED</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async updateOrderStatusAdmin(orderId, newStatus) {
    try {
      await this.apiCall(`/orders/${orderId}/status`, "PUT", { orderStatus: newStatus, note: "Updated via Admin Console" });
      this.showToast(`Order status updated to ${newStatus}`, "success");
      this.loadAdminOrders();
    } catch (err) {
      this.showToast(`Failed to update order status: ${err.message}`, "error");
      this.loadAdminOrders();
    }
  }

  // Add/Edit Product Modal Handlers
  openAddProductModal() {
    document.getElementById("product-modal-title").textContent = "Add New Product";
    document.getElementById("edit-product-id").value = "";
    document.getElementById("product-form").reset();
    document.getElementById("product-modal").classList.add("active");
  }

  closeProductModal() {
    document.getElementById("product-modal").classList.remove("active");
  }

  async handleSaveProduct(e) {
    e.preventDefault();
    const sku = document.getElementById("prod-sku").value.trim();
    const category = document.getElementById("prod-category").value;
    const title = document.getElementById("prod-title").value.trim();
    const price = parseFloat(document.getElementById("prod-price").value);
    const stockQuantity = parseInt(document.getElementById("prod-stock").value, 10);
    const minStockThreshold = parseInt(document.getElementById("prod-threshold").value, 10);
    const description = document.getElementById("prod-desc").value.trim();

    try {
      await this.apiCall("/products", "POST", {
        sku, category, title, price, stockQuantity, minStockThreshold, description
      });

      this.showToast("New product created successfully!", "success");
      this.closeProductModal();
      await this.loadProducts();
      this.renderAdminStockTable();
    } catch (err) {
      this.showToast(`Save product failed: ${err.message}`, "error");
    }
  }
}

// Initialize single application instance when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ApexApp();
});
