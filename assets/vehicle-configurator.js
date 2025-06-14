/**
 * Updated Vehicle Configurator JavaScript with Vehicle Selection
 * File: assets/vehicle-configurator-updated.js
 */

class VehicleConfigurator {
  constructor() {
    this.currentZone = null;
    this.currentView = 'front';
    this.selectedVehicle = null;
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
    this.showVehicleSelector();
  }

  bindEvents() {
    // Vehicle selector
    document.querySelectorAll('.vehicle-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const vehicleHandle = e.currentTarget.getAttribute('data-vehicle');
        const vehicleName = e.currentTarget.getAttribute('data-vehicle-name');
        this.selectVehicle(vehicleHandle, vehicleName);
      });
    });

    // Change vehicle button
    const changeVehicleBtn = document.getElementById('changeVehicleBtn');
    if (changeVehicleBtn) {
      changeVehicleBtn.addEventListener('click', () => {
        this.showVehicleSelector();
      });
    }

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
        if (!this.selectedVehicle) {
          this.showVehicleSelector();
          return;
        }
        const zoneId = e.target.getAttribute('data-zone');
        this.showZone(zoneId);
      });
    });
  }

  showVehicleSelector() {
    document.getElementById('vehicleSelector').style.display = 'flex';
    document.getElementById('selectedVehicleHeader').style.display = 'none';
  }

  selectVehicle(vehicleHandle, vehicleName) {
    this.selectedVehicle = vehicleHandle;
    
    // Hide vehicle selector
    document.getElementById('vehicleSelector').style.display = 'none';
    
    // Show selected vehicle header
    document.getElementById('selectedVehicleHeader').style.display = 'block';
    document.getElementById('selectedVehicleName').textContent = vehicleName;
    
    // Update vehicle images
    this.updateVehicleImages(vehicleHandle);
    
    // Initialize configurator
    this.switchView('front');
    
    // Clear any cached products (vehicle changed)
    this.productCache = {};
  }

  updateVehicleImages(vehicleHandle) {
    const vehicle = this.config.vehicles.find(v => v.handle === vehicleHandle);
    if (!vehicle) return;

    const display = document.getElementById('vehicleDisplay');
    const style = document.createElement('style');
    
    let css = '';
    Object.keys(vehicle.images).forEach(view => {
      if (vehicle.images[view]) {
        css += `.view-${view} { background-image: url('${vehicle.images[view]}'); }\n`;
      }
    });
    
    style.textContent = css;
    
    // Remove previous vehicle styles
    const existingStyles = document.querySelectorAll('style[data-vehicle-images]');
    existingStyles.forEach(s => s.remove());
    
    style.setAttribute('data-vehicle-images', vehicleHandle);
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
    if (!this.selectedVehicle) {
      this.showVehicleSelector();
      return;
    }

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
      if (titleElement) {
        titleElement.textContent = `${zoneId.toUpperCase()} - ${this.getZoneDescription(zoneId)}`;
      }
      
      // Load products for this zone and vehicle
      await this.loadZoneProducts(zoneId);
    }
    
    // Activate hotspot
    document.querySelector(`[data-zone="${zoneId}"]`).classList.add('active');
    
    this.currentZone = zoneId;
  }

  getZoneDescription(zoneId) {
    const descriptions = {
      f1: 'Front Left Headlight', f2: 'Front Right Headlight', f3: 'Front Roof Equipment',
      f4: 'Front Left Grille', f5: 'Front Right Grille', f6: 'Left Front Bumper',
      f7: 'Right Front Bumper', f8: 'Left Side Mirror', f9: 'Right Side Mirror',
      f10: 'Lower Front Bumper', f11: 'Upper Roof',
      r1: 'Left Rear Light', r2: 'Right Rear Light', r3: 'Rear Window',
      r4: 'Left Rear Side', r5: 'Right Rear Side', r6: 'Left Rear Bumper',
      r7: 'Right Rear Bumper', r8: 'Lower Rear Bumper',
      s1: 'Front Roof Side', s2: 'Rear Roof Side', s3: 'Front Door Panel',
      s4: 'Rear Door Panel', s5: 'Side Window Center', s6: 'Front Wheel Well',
      s7: 'Rear Wheel Well', s8: 'Lower Front Side', s9: 'Lower Rear Side',
      t1: 'Left Trunk Storage', t2: 'Right Trunk Storage', t3: 'Lower Trunk Area',
      t4: 'Trunk Electronics Bay', i1: 'Driver Console', i2: 'Passenger Console'
    };
    return descriptions[zoneId] || 'Vehicle Zone';
  }

  async loadZoneProducts(zoneId) {
    const cacheKey = `${this.selectedVehicle}-${zoneId}`;
    const productsContainer = document.getElementById(`zone-products-${zoneId}`);
    
    // Check cache first
    if (this.productCache[cacheKey]) {
      productsContainer.innerHTML = this.productCache[cacheKey];
      this.bindAddToCartEvents(zoneId);
      return;
    }

    // Show loading
    productsContainer.innerHTML = '<div class="loading-spinner">Loading compatible products...</div>';

    try {
      // Fetch products for this zone using Shopify's AJAX API
      const response = await fetch(`/collections/${this.config.collection_handle}/products.json`);
      const data = await response.json();
      
      // Filter products by vehicle-specific zone tag
      const vehicleZoneTag = `${this.selectedVehicle}-zone-${zoneId}`;
      const universalZoneTag = `universal-zone-${zoneId}`;
      
      const zoneProducts = data.products.filter(product => 
        product.tags.includes(vehicleZoneTag) || 
        product.tags.includes(universalZoneTag) ||
        // Fallback: check for old-style tags if using migration period
        (product.tags.includes(`zone-${zoneId}`) && product.tags.includes(this.selectedVehicle))
      );

      // Render products
      const productsHtml = this.renderProducts(zoneProducts);
      productsContainer.innerHTML = productsHtml;
      
      // Cache the result
      this.productCache[cacheKey] = productsHtml;
      
      // Bind add to cart events
      this.bindAddToCartEvents(zoneId);
      
    } catch (error) {
      console.error('Error loading products:', error);
      productsContainer.innerHTML = '<div class="error-message">Error loading products. Please try again.</div>';
    }
  }

  renderProducts(products) {
    if (products.length === 0) {
      return '<div class="no-products">No compatible products available for this zone.<br><small>Products may be vehicle-specific.</small></div>';
    }

    return products.map(product => {
      const variant = product.variants[0];
      const price = this.formatMoney(variant.price);
      const image = product.images[0] ? product.images[0].src : '';
      
      return `
        <div class="product-item" data-product-id="${product.id}">
          ${image ? `<div class="product-image-container"><img src="${image}" alt="${product.title}" class="product-image"></div>` : ''}
          <div class="product-details">
            <div class="product-name">${product.title}</div>
            <div class="product-price">${price}</div>
            <div class="product-description">${this.stripHtml(product.body_html).substring(0, 120)}...</div>
            ${this.renderCompatibilityBadge(product)}
            <button class="add-to-cart-btn" 
                    data-variant-id="${variant.id}" 
                    data-product-title="${product.title}"
                    data-product-price="${variant.price}">
              Add to Cart
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCompatibilityBadge(product) {
    const isUniversal = product.tags.some(tag => tag.includes('universal-zone-'));
    if (isUniversal) {
      return '<div class="compatibility-badge universal">Universal Fit</div>';
    }
    
    const vehicleName = this.config.vehicles.find(v => v.handle === this.selectedVehicle)?.name || '';
    return `<div class="compatibility-badge vehicle-specific">Fits ${vehicleName}</div>`;
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
            quantity: 1,
            properties: {
              'Vehicle': this.config.vehicles.find(v => v.handle === this.selectedVehicle)?.name || '',
              'Zone': this.currentZone.toUpperCase(),
              'View': this.currentView
            }
          }]
        })
      });

      if (response.ok) {
        await this.updateCartDisplay();
        this.showAddedToCartFeedback(productTitle);
        
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
      max-width: 300px;
    `;
    feedback.innerHTML = `
      <div>✓ ${productTitle}</div>
      <small>Added to ${this.config.vehicles.find(v => v.handle === this.selectedVehicle)?.name || ''} build</small>
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
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