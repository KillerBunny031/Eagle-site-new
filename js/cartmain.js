// Объект для хранения корзины
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Функция проверки кд
function checkCooldown() {
    const lastOrderTime = localStorage.getItem('lastOrderTime');
    if (!lastOrderTime) return { allowed: true, remaining: 0 }; // Можно отправлять
    
    const now = Date.now();
    const cooldownTime = 30 * 60 * 1000; // 30 минут в миллисекундах
    const timeSinceLastOrder = now - parseInt(lastOrderTime);
    
    if (timeSinceLastOrder < cooldownTime) {
        const remainingMinutes = Math.ceil((cooldownTime - timeSinceLastOrder) / 60000);
        return { allowed: false, remaining: remainingMinutes };
    }
    
    return { allowed: true, remaining: 0 };
}
// Флаг блокировки отправки
const SEND_ORDERS_DISABLED = true;

// Оригинальная функция (если хочешь сохранить)
const originalSendOrder = sendOrderToDiscord;

//#region блок дискорда
sendOrderToDiscord = async function(discordUsername, cartItems, totalAmount) {
    if (SEND_ORDERS_DISABLED) {
        
        showNotification('Заказ сохранен! Отправка заказа временно отключена');
        console.log('Заглушка заказа:', { discordUsername, cartItems, totalAmount });
        return true; // Корзина очистится
    }
    
};
//#endregion

// Функция установки Cooldown
function setCooldown() {
    localStorage.setItem('lastOrderTime', Date.now().toString());
}

// Функция получения красивого времени
function getCooldownMessage(minutes) {
    if (minutes === 1) {
        return '1 минуту';
    } else if (minutes < 5) {
        return `${minutes} минуты`;
    } else {
        return `${minutes} минут`;
    }
}

// Функция отправки заказа в дискорд
async function sendOrderToDiscord(discordUsername, cartItems, totalAmount) {
    const WEBHOOK_URL = CONFIG.DISCORD_WEBHOOK_URL;
    const ROLE_ID = CONFIG.DISCORD_ROLE_ID;

    // Формируем сообщение с пингом в самом начале
    const orderData = {
        content: `<@&${ROLE_ID}>\n\n🎯 **НОВЫЙ ЗАКАЗ ОТ \`${discordUsername}\`**\n\n` +
                 `**Товары:**\n` +
                 cartItems.map(item => `• ${item.name} x${item.quantity} - ${item.price * item.quantity} руб.`).join('\n') + `\n\n` +
                 `**Общая сумма:** ${totalAmount} руб.\n` +
                 `**Время:** <t:${Math.floor(Date.now() / 1000)}:R>`
    };
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            setCooldown(); // Устанавливаем кд после успешной отправки
            return true;
        } else {
            const errorText = await response.text();
            console.error('Ошибка Discord:', errorText);
            throw new Error('Ошибка отправки в Discord');
        }
    } catch (error) {
        console.error('Ошибка отправки в Discord:', error);
        return false;
    }
}

// Функция добавления в корзину
function addToCart(productName, productPrice, productImage = '') {
    const existingItem = cart.find(item => item.name === productName);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1
        });
    }
    
    updateCartSidebar();
    saveCartToStorage();
    showNotification(`${productName} добавлен в корзину!`);
}

// Функция обновления боковой корзины
function updateCartSidebar() {
    const cartItems = document.querySelector('.cart-items-sidebar');
    const totalAmount = document.querySelector('.total-amount');
    const cartCountBadge = document.querySelector('.cart-count-badge');
    const checkoutBtn = document.querySelector('.checkout-btn-sidebar');
    const cartSidebar = document.getElementById('cartSidebar');
    const discordInput = document.getElementById('discordUsername');
    
    // Обновляем счетчик
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountBadge.textContent = totalItems;
    
    // Показываем/скрываем корзину
    if (cart.length === 0) {
        cartSidebar.classList.remove('active');
        checkoutBtn.disabled = true;
        discordInput.value = ''; // Очищаем поле при пустой корзине
    } else {
        cartSidebar.classList.add('active');
        
        // Проверяем кд и валидность Discord
        const cooldownCheck = checkCooldown();
        const discordValid = discordInput.checkValidity();
        
        // Кнопка активна только если нет кд и Discord валиден
        checkoutBtn.disabled = !discordValid || !cooldownCheck.allowed;
        
        // Обновляем текст кнопки
        updateCheckoutButtonText(cooldownCheck);
    }
    
    // Обновляем список товаров
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item-sidebar';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.style.display='none'">
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${item.price} руб.</p>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">-</button>
                <span class="cart-item-quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                <button class="remove-item-sidebar" onclick="removeFromCart(${index})">×</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    totalAmount.textContent = `${total} руб.`;
}

// Функции для работы с корзиной
function changeQuantity(index, change) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    
    updateCartSidebar();
    saveCartToStorage();
}

function removeFromCart(index) {
    const itemName = cart[index].name;
    cart.splice(index, 1);
    updateCartSidebar();
    saveCartToStorage();
    showNotification(`${itemName} удален из корзины`);
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Функция уведомления
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#e74c3c' : '#27ae60'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        font-weight: 500;
        border-left: 4px solid ${isError ? '#c0392b' : '#229954'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Функция обновления текста кнопки
function updateCheckoutButtonText(cooldownCheck) {
    const checkoutBtn = document.querySelector('.checkout-btn-sidebar');
    
    if (cooldownCheck.allowed) {
        checkoutBtn.textContent = 'Отправить заказ в Discord';
        checkoutBtn.classList.remove('cooldown');
        checkoutBtn.title = '';
    } else {
        const remainingTime = getCooldownMessage(cooldownCheck.remaining);
        checkoutBtn.textContent = `Ждите ${remainingTime}`;
        checkoutBtn.classList.add('cooldown');
        checkoutBtn.title = `Следующий заказ можно будет отправить через ${remainingTime}`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    updateCartSidebar();
    
    // Валидация Discord username в реальном времени
    const discordInput = document.getElementById('discordUsername');
    const checkoutBtn = document.querySelector('.checkout-btn-sidebar');
    
    discordInput.addEventListener('input', function() {
        const isValid = this.checkValidity();
        const cooldownCheck = checkCooldown();
        
        // Обновляем состояние кнопки
        checkoutBtn.disabled = cart.length === 0 || !isValid || !cooldownCheck.allowed;
        
        if (this.value && !isValid) {
            this.style.borderColor = '#e74c3c';
        } else {
            this.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
        
        // Обновляем текст кнопки
        updateCheckoutButtonText(cooldownCheck);
    });
    
    // Обработка отправки заказа
    checkoutBtn.addEventListener('click', async function() {
        if (cart.length === 0) return;
        
        const discordUsername = discordInput.value.trim();
        if (!discordUsername) {
            showNotification('Введите ваш Discord username', true);
            return;
        }
        
        // Валидация формата Discord
        const discordRegex = /^[a-zA-Z0-9_]{1,32}(#[0-9]{4})?$/;
        if (!discordRegex.test(discordUsername)) {
            showNotification('Неверный формат Discord username', true);
            return;
        }
        
        // Проверяем Cooldown
        const cooldownCheck = checkCooldown();
        if (!cooldownCheck.allowed) {
            const remainingTime = getCooldownMessage(cooldownCheck.remaining);
            showNotification(`Следующий заказ можно отправить через ${remainingTime}`, true);
            return;
        }
        
        // Показываем состояние загрузки
        const originalText = checkoutBtn.textContent;
        checkoutBtn.textContent = 'Отправка...';
        checkoutBtn.classList.add('loading');
        checkoutBtn.disabled = true;
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Отправляем заказ в Discord
        const success = await sendOrderToDiscord(discordUsername, cart, total);
        
        // Возвращаем обычное состояние кнопки
        checkoutBtn.classList.remove('loading');
        
        if (success) {
            showNotification(`Заказ отправлен! Мы свяжемся с вами в Discord (${discordUsername})`);
            
            // Очищаем корзину после успешной отправки
            cart = [];
            updateCartSidebar();
            saveCartToStorage();
            discordInput.value = '';
        } else {
            showNotification('Ошибка отправки заказа. Попробуйте позже.', true);
            checkoutBtn.textContent = originalText;
            checkoutBtn.disabled = false;
        }
    });
});

// Функция принудительного сброса Cooldown (для тестирования)
function resetCooldownNiggerEbany() {
    localStorage.removeItem('lastOrderTime');
    showNotification('Cooldown сброшен!');
    updateCartSidebar(); // Обновляем корзину чтобы кнопка обновилась
}

// Добавляем CSS для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// resetCooldownNiggerEbany()