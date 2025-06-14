/**
 * Vehicle Configurator JavaScript
 * File: assets/vehicle-configurator.js
 */

class VehicleConfigurator {
  constructor() {
    this.currentZone = null;
    this.currentView = 'front';
    this.config = this.getConfigData();
    this.productCache = {};
    
    this.init();
  }

  getConfigData() {
    const dataElement = document.getElementById('configurator-data');
    return dataElement ? JSON.parse(dataElement.textContent) : {};
  }

  init() {
    this.bindEvents();
    this.switchView('front');
    this.updateVehicleImages();
  }

  bindEvents() {
    // View switcher
    document.querySelectorAll('.view-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const view = e.target.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Zone hotspots
    document.querySelectorAll('.zone-hotspot').forEach(hotspot => {
      hotspot.addEventListener('click', (e) => {
        const zoneId = e.target.getAttribute('data-zone');
        this.showZone(zoneId);
      });
    });
  }

  updateVehicleImages() {
    const display = document.getElementById('vehicleDisplay');
    const style = document.createElement('style');
    
    let css = '';
    Object.keys(this.config.images).forEach(view => {
      if (this.config.images[view]) {
        css += `.view-${view} { background-image: url('${this.config.images[view]}'); }\n`;
      }
    });
    
    style.textContent = css;
    document.head.appendChild(style);
  }

  switchView(view) {
    this.currentView = view;
    
    // Update view selector
    document.querySelectorAll('.view-option').forEach(option => {
      option.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    // Update background
    const display = document.getElementById('vehicleDisplay');
    display.className = `vehicle-display view-${view}`;
    
    // Hide all zones
    document.querySelectorAll('.zone-hotspot').forEach(hotspot => {
      hotspot.style.display = 'none';
      hotspot.classList.remove('active');
    });
    
    // Show zones for current view
    document.querySelectorAll(`[data-view="${view}"]`).forEach(hotspot => {
      hotspot.style.display = 'flex';
    });
    
    // Hide all zone content
    document.querySelectorAll('.zone-content').forEach(content => {
      content.style.display = 'none';
    });
    
    // Show welcome message
    document.getElementById('welcomeMessage').style.display = 'block';
  }

  async showZone(zoneId) {
    // Hide welcome message
    document.getElementById('welcomeMessage').style.display = 'none';
    
    // Remove active class from all zones
    document.querySelectorAll('.zone-hotspot').forEach(hotspot => {
      hotspot.classList.remove('active');
    });
    document.querySelectorAll('.zone-content').forEach(zone => {
      zone.style.display = 'none';
    });
    
    // Show selected zone
    const zoneElement = document.getElementById(`zone-${zoneId}`);
    if (zoneElement) {
      zoneElement.style.display = 'block';
      
      // Set zone title
      const titleElement = document.getElementById(`zone-title-${zoneId}`);
      if (titleElement && this.config.zone_titles[zoneId]) {
        titleElement.textContent = this.config.zone_titles[zoneId];
      }
      
      // Load products for this zone
      await this.loadZoneProducts(zoneId);
    }
    
    // Activate hotspot
    document.querySelector(`[data-zone="${zoneId}"]`).classList.add('active');
    
    this.currentZone = zoneId;
  }

  async loadZoneProducts(zoneId) {
    const productsContainer = document.getElementById(`zone-products-${zoneId}`);
    
    // Check cache first
    if (this.productCache[zoneId]) {
      productsContainer.innerHTML = this.productCache[zoneId];
      return;
    }

    // Show loading
    productsContainer.innerHTML = '<div class="loading-spinner">Loading products...</div>';

    try {
      // Fetch products for this zone using Shopify's AJAX API
      const response = await fetch(`/collections/${this.config.collection_handle}/products.json`);
      const data = await response.json();
      
      // Filter products by zone tag
      const zoneProducts = data.products.filter(product => 
        product.tags.includes(`zone-${zoneId}`) || 
        product.tags.includes(`zone_${zoneId}`)
      );

      // Render products
      const productsHtml = this.renderProducts(zoneProducts);
      productsContainer.innerHTML = productsHtml;
      
      // Cache the result
      this.productCache[zoneId] = productsHtml;
      
      // Bind add to cart events
      this.bindAddToCartEvents(zoneId);
      
    } catch (error) {
      console.error('Error loading products:', error);
      productsContainer.innerHTML = '<div class="error-message">Error loading products. Please try again.</div>';
    }
  }

  renderProducts(products) {
    if (products.length === 0) {
      return '<div class="no-products">No products available for this zone.</div>';
    }

    return products.map(product => {
      const variant = product.variants[0]; // Use first variant
      const price = this.formatMoney(variant.price);
      
      return `
        <div class="product-item" data-product-id="${product.id}">
          <div class="product-name">${product.title}</div>
          <div class="product-price">${price}</div>
          <div class="product-description">${this.stripHtml(product.body_html).substring(0, 150)}...</div>
          <button class="add-to-cart-btn" 
                  data-variant-id="${variant.id}" 
                  data-product-title="${product.title}"
                  data-product-price="${variant.price}">
            Add to Cart
          </button>
        </div>
      `;
    }).join('');
  }

  bindAddToCartEvents(zoneId) {
    const buttons = document.querySelectorAll(`#zone-products-${zoneId} .add-to-cart-btn`);
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = button.getAttribute('data-variant-id');
        const productTitle = button.getAttribute('data-product-title');
        this.addToCart(variantId, productTitle, button);
      });
    });
  }

  async addToCart(variantId, productTitle, buttonElement) {
    // Disable button and show loading
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Adding...';
    buttonElement.disabled = true;

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            id: variantId,
            quantity: 1
          }]
        })
      });

      if (response.ok) {
        // Update cart count
        await this.updateCartDisplay();
        
        // Show success feedback
        this.showAddedToCartFeedback(productTitle);
        
        // Reset button
        buttonElement.textContent = 'Added!';
        setTimeout(() => {
          buttonElement.textContent = originalText;
          buttonElement.disabled = false;
        }, 2000);
        
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      buttonElement.textContent = 'Error - Try Again';
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
      }, 2000);
    }
  }

  async updateCartDisplay() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      document.getElementById('cartCount').textContent = cart.item_count;
      
      if (cart.item_count > 0) {
        document.getElementById('cartSummary').style.display = 'block';
      }
    } catch (error) {
      console.error('Error updating cart display:', error);
    }
  }

  showAddedToCartFeedback(productTitle) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 1000;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
      animation: slideIn 0.3s ease;
    `;
    feedback.textContent = `✓ ${productTitle} added to cart!`;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (document.body.contains(feedback)) {
          document.body.removeChild(feedback);
        }
      }, 300);
    }, 3000);
  }

  formatMoney(cents) {
    const amount = cents / 100;
    return this.config.shop_money_format.replace('{{amount}}', amount.toFixed(2));
  }

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('vehicleConfigurator')) {
    new VehicleConfigurator();
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100%); }
  }
`;
document.head.appendChild(style);