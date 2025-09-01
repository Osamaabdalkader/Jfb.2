// Import Firebase functions
import { 
  auth, database, storage,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut, ref, set, push, onValue,
  serverTimestamp, update, remove, query, orderByChild,
  equalTo, storageRef, uploadBytesResumable, getDownloadURL
} from './firebase.js';

// DOM elements
const homePage = document.getElementById('home-page');
const authPage = document.getElementById('auth-page');
const profilePage = document.getElementById('profile-page');
const messagesPage = document.getElementById('messages-page');
const postDetailPage = document.getElementById('post-detail-page');
const ordersPage = document.getElementById('orders-page');
const orderDetailPage = document.getElementById('order-detail-page');

const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

const postsContainer = document.getElementById('posts-container');
const userInfo = document.getElementById('user-info');
const postDetailContent = document.getElementById('post-detail-content');
const ordersContainer = document.getElementById('orders-container');
const orderDetailContent = document.getElementById('order-detail-content');

const profileIcon = document.getElementById('profile-icon');
const messagesIcon = document.getElementById('messages-icon');
const supportIcon = document.getElementById('support-icon');
const moreIcon = document.getElementById('more-icon');
const homeIcon = document.getElementById('home-icon');
const closeAuthBtn = document.getElementById('close-auth');
const closeProfileBtn = document.getElementById('close-profile');
const closeMessagesBtn = document.getElementById('close-messages');
const closePostDetailBtn = document.getElementById('close-post-detail');
const closeOrdersBtn = document.getElementById('close-orders');
const closeOrderDetailBtn = document.getElementById('close-order-detail');

// System variables
let currentUserData = null;
let adminUsers = [];
let currentOrders = [];
let currentOrder = null;
let currentPost = null;
let ordersListener = null;
let messagesListener = null;
let activeUserId = null;
let userMessages = {};
let userUnreadCounts = {};
let userLastMessageTime = {};

// Load posts and admin users when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  loadAdminUsers();
  addAdminIconToFooter();
  
  // Check if we need to redirect after login
  const redirectUrl = localStorage.getItem('redirectUrl');
  if (redirectUrl) {
    const user = auth.currentUser;
    if (user) {
      window.location.href = redirectUrl;
      localStorage.removeItem('redirectUrl');
    }
  }
});

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Load current user data
    const userRef = ref(database, 'users/' + user.uid);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        currentUserData = snapshot.val();
        currentUserData.uid = user.uid;
        
        // Save user data to localStorage for other pages
        localStorage.setItem('currentUser', JSON.stringify(currentUserData));
        
        // Show admin icon if user is admin
        if (currentUserData.isAdmin) {
          document.getElementById('admin-icon').style.display = 'flex';
        }
      }
    });
    
    // Hide auth page, show home page
    authPage.classList.add('hidden');
    homePage.classList.remove('hidden');
  } else {
    // User is signed out
    currentUserData = null;
    localStorage.removeItem('currentUser');
    
    // Show auth page, hide other pages
    showPage(authPage);
  }
});

// Load admin users
function loadAdminUsers() {
  const usersRef = ref(database, 'users');
  onValue(usersRef, (snapshot) => {
    adminUsers = [];
    
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const userId in users) {
        if (users[userId].isAdmin) {
          adminUsers.push({
            id: userId,
            ...users[userId]
          });
        }
      }
    }
  });
}

// Load posts
function loadPosts() {
  const postsRef = ref(database, 'posts');
  onValue(postsRef, (snapshot) => {
    postsContainer.innerHTML = '';
    
    if (!snapshot.exists()) {
      postsContainer.innerHTML = '<p class="no-posts">لا توجد منشورات بعد</p>';
      return;
    }
    
    const posts = snapshot.val();
    const postsArray = [];
    
    for (const postId in posts) {
      postsArray.push({
        id: postId,
        ...posts[postId]
      });
    }
    
    // Sort posts by creation date (newest first)
    postsArray.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt - a.createdAt;
    });
    
    // Create post cards
    postsArray.forEach(post => {
      const postCard = createPostCard(post);
      postsContainer.appendChild(postCard);
    });
  });
}

// Create post card
function createPostCard(post) {
  const postCard = document.createElement('div');
  postCard.className = 'post-card';
  postCard.innerHTML = `
    <div class="post-image">
      ${post.imageUrl ? 
        `<img src="${post.imageUrl}" alt="${post.title}" onerror="this.style.display='none'">` : 
        `<i class="fas fa-image"></i>`
      }
    </div>
    <div class="post-content">
      <h3 class="post-title">${post.title}</h3>
      <p class="post-description">${post.description}</p>
      <div class="post-meta">
        <span class="post-price">${post.price}</span>
        <span class="post-author">
          <i class="fas fa-map-marker-alt"></i> ${post.location}
        </span>
      </div>
    </div>
  `;
  
  postCard.addEventListener('click', () => {
    showPostDetail(post);
  });
  
  return postCard;
}

// Show post detail
function showPostDetail(post) {
  currentPost = post;
  
  postDetailContent.innerHTML = `
    ${post.imageUrl ? 
      `<img src="${post.imageUrl}" alt="${post.title}" class="post-detail-image" onerror="this.style.display='none'">` : 
      `<div class="post-detail-image" style="display:flex;align-items:center;justify-content:center;background:#f0f0f0;">
         <i class="fas fa-image" style="font-size:3rem;color:#ccc;"></i>
       </div>`
    }
    <h2 class="post-detail-title">${post.title}</h2>
    <p class="post-detail-description">${post.description}</p>
    
    <div class="post-detail-meta">
      <div class="meta-item">
        <i class="fas fa-tag"></i>
        <span>السعر: ${post.price}</span>
      </div>
      <div class="meta-item">
        <i class="fas fa-map-marker-alt"></i>
        <span>الموقع: ${post.location}</span>
      </div>
      <div class="meta-item">
        <i class="fas fa-phone"></i>
        <span>الهاتف: ${post.phone}</span>
      </div>
    </div>
    
    <div class="purchase-section">
      <button id="buy-now-btn" class="btn btn-success">اشتري الآن</button>
    </div>
  `;
  
  document.getElementById('buy-now-btn').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
      showPage(authPage);
      return;
    }
    
    createOrder(user.uid, post);
  });
  
  showPage(postDetailPage);
}

// Create order
async function createOrder(userId, post) {
  try {
    const ordersRef = ref(database, 'orders');
    const newOrderRef = push(ordersRef);
    
    const orderData = {
      id: newOrderRef.key,
      buyerId: userId,
      sellerId: post.authorId,
      postId: post.id,
      postTitle: post.title,
      postPrice: post.price || 'غير محدد',
      postImage: post.imageUrl || '',
      status: 'pending',
      createdAt: serverTimestamp()
    };
    
    await set(newOrderRef, orderData);
    alert('تم إنشاء الطلب بنجاح! سيتم التواصل معك قريباً.');
    showPage(homePage);
  } catch (error) {
    console.error('Error creating order:', error);
    alert('حدث خطأ أثناء إنشاء الطلب: ' + error.message);
  }
}

// Add admin icon to footer
function addAdminIconToFooter() {
  const footerIcons = document.querySelector('.footer-icons');
  const adminIcon = document.getElementById('admin-icon');
  
  if (currentUserData && currentUserData.isAdmin) {
    adminIcon.style.display = 'flex';
    adminIcon.addEventListener('click', openOrdersPage);
  }
}

// Open orders page (for admins only)
function openOrdersPage() {
  if (!currentUserData || !currentUserData.isAdmin) {
    alert('عفواً، هذه الصفحة للإدارة فقط');
    return;
  }
  
  showPage(ordersPage);
  loadOrders();
}

// Load orders for management
function loadOrders(filter = 'all') {
  if (!currentUserData || !currentUserData.isAdmin) return;
  
  if (ordersListener) {
    ordersListener();
  }
  
  const ordersRef = ref(database, 'orders');
  ordersListener = onValue(ordersRef, (snapshot) => {
    ordersContainer.innerHTML = '';
    currentOrders = [];
    
    if (!snapshot.exists()) {
      ordersContainer.innerHTML = '<p class="no-orders">لا توجد طلبات بعد</p>';
      return;
    }
    
    const orders = snapshot.val();
    const ordersByPost = {};
    
    for (const orderId in orders) {
      const order = {
        id: orderId,
        ...orders[orderId]
      };
      
      currentOrders.push(order);
      
      // Filter orders based on selected filter
      if (filter !== 'all' && order.status !== filter) {
        continue;
      }
      
      if (!ordersByPost[order.postId]) {
        ordersByPost[order.postId] = {
          postId: order.postId,
          postTitle: order.postTitle,
          postImage: order.postImage,
          orders: []
        };
      }
      
      ordersByPost[order.postId].orders.push(order);
    }
    
    // Create order items grouped by post
    for (const postId in ordersByPost) {
      const postData = ordersByPost[postId];
      const orderElement = createPostOrderItem(postData);
      ordersContainer.appendChild(orderElement);
    }
  });
}

// Create post order item
function createPostOrderItem(postData) {
  const orderElement = document.createElement('div');
  orderElement.className = 'order-item';
  orderElement.dataset.postId = postData.postId;
  
  const pendingCount = postData.orders.filter(o => o.status === 'pending').length;
  const approvedCount = postData.orders.filter(o => o.status === 'approved').length;
  const rejectedCount = postData.orders.filter(o => o.status === 'rejected').length;
  
  orderElement.innerHTML = `
    <div class="order-header">
      <h3 class="order-title">${postData.postTitle}</h3>
      <span class="order-count">${postData.orders.length} طلب</span>
    </div>
    <div class="order-meta">
      <div class="order-statuses">
        ${pendingCount > 0 ? `<span class="status-badge status-pending">${pendingCount} قيد الانتظار</span>` : ''}
        ${approvedCount > 0 ? `<span class="status-badge status-approved">${approvedCount} مقبول</span>` : ''}
        ${rejectedCount > 0 ? `<span class="status-badge status-rejected">${rejectedCount} مرفوض</span>` : ''}
      </div>
    </div>
  `;
  
  orderElement.addEventListener('click', () => {
    showPostOrders(postData);
  });
  
  return orderElement;
}

// Show orders for a specific post
function showPostOrders(postData) {
  window.currentPostOrders = postData;
  
  ordersContainer.innerHTML = `
    <button class="btn back-btn" id="back-to-orders">
      <i class="fas fa-arrow-right"></i> العودة إلى الطلبات
    </button>
    <div class="post-orders-header">
      <h3>${postData.postTitle}</h3>
      <p>إدارة الطلبات لهذا المنشور</p>
    </div>
  `;
  
  postData.orders.forEach(order => {
    const orderElement = createIndividualOrderItem(order);
    ordersContainer.appendChild(orderElement);
  });
  
  document.getElementById('back-to-orders').addEventListener('click', () => {
    loadOrders();
  });
}

// Create individual order item
function createIndividualOrderItem(order) {
  const orderElement = document.createElement('div');
  orderElement.className = 'order-item individual-order';
  orderElement.dataset.orderId = order.id;
  
  let statusClass = 'status-pending';
  let statusText = 'قيد الانتظار';
  
  if (order.status === 'approved') {
    statusClass = 'status-approved';
    statusText = 'مقبول';
  } else if (order.status === 'rejected') {
    statusClass = 'status-rejected';
    statusText = 'مرفوض';
  }
  
  orderElement.innerHTML = `
    <div class="order-header">
      <h3 class="order-title">طلب #${order.id.substring(0, 8)}</h3>
      <span class="order-status ${statusClass}">${statusText}</span>
    </div>
    <div class="order-meta">
      <span>المشتري: ${order.buyerId.substring(0, 8)}...</span>
      <span class="order-price">${order.postPrice}</span>
    </div>
  `;
  
  orderElement.addEventListener('click', () => {
    showOrderDetail(order);
  });
  
  return orderElement;
}

// Show order details
async function showOrderDetail(order) {
  currentOrder = order;
  
  try {
    // Get buyer info
    const buyerRef = ref(database, 'users/' + order.buyerId);
    const buyerSnapshot = await onValue(buyerRef, (snapshot) => {
      if (snapshot.exists()) {
        const buyer = snapshot.val();
        order.buyerName = buyer.name || 'مشتري';
        order.buyerPhone = buyer.phone || 'غير متوفر';
      }
    }, { onlyOnce: true });
    
    // Get seller info
    const sellerRef = ref(database, 'users/' + order.sellerId);
    const sellerSnapshot = await onValue(sellerRef, (snapshot) => {
      if (snapshot.exists()) {
        const seller = snapshot.val();
        order.sellerName = seller.name || 'بائع';
        order.sellerPhone = seller.phone || 'غير متوفر';
      }
    }, { onlyOnce: true });
    
    orderDetailContent.innerHTML = `
      <div class="order-detail-section">
        <h3>معلومات الطلب</h3>
        <div class="order-detail-item">
          <span class="order-detail-label">رقم الطلب:</span>
          <span class="order-detail-value">${order.id}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">حالة الطلب:</span>
          <span class="order-detail-value">
            <span class="order-status ${order.status === 'pending' ? 'status-pending' : order.status === 'approved' ? 'status-approved' : 'status-rejected'}">
              ${order.status === 'pending' ? 'قيد الانتظار' : order.status === 'approved' ? 'مقبول' : 'مرفوض'}
            </span>
          </span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">تاريخ الطلب:</span>
          <span class="order-detail-value">${formatDate(order.createdAt)}</span>
        </div>
      </div>
      
      <div class="order-detail-section">
        <h3>معلومات المنتج</h3>
        <div class="order-detail-item">
          <span class="order-detail-label">اسم المنتج:</span>
          <span class="order-detail-value">${order.postTitle}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">سعر المنتج:</span>
          <span class="order-detail-value">${order.postPrice}</span>
        </div>
      </div>
      
      <div class="order-detail-section">
        <h3>معلومات المشتري</h3>
        <div class="order-detail-item">
          <span class="order-detail-label">اسم المشتري:</span>
          <span class="order-detail-value">${order.buyerName || 'مشتري'}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">هاتف المشتري:</span>
          <span class="order-detail-value">${order.buyerPhone || 'غير متوفر'}</span>
        </div>
      </div>
      
      <div class="order-detail-section">
        <h3>معلومات البائع</h3>
        <div class="order-detail-item">
          <span class="order-detail-label">اسم البائع:</span>
          <span class="order-detail-value">${order.sellerName || 'بائع'}</span>
        </div>
        <div class="order-detail-item">
          <span class="order-detail-label">هاتف البائع:</span>
          <span class="order-detail-value">${order.sellerPhone || 'غير متوفر'}</span>
        </div>
      </div>
      
      ${order.status === 'pending' ? `
        <div class="order-actions">
          <button id="approve-order-btn" class="btn" style="background: var(--success-color);">قبول الطلب</button>
          <button id="reject-order-btn" class="btn" style="background: var(--danger-color);">رفض الطلب</button>
          <button id="chat-with-buyer-btn" class="btn">التحدث مع المشتري</button>
          <button id="chat-with-seller-btn" class="btn">التحدث مع البائع</button>
        </div>
      ` : ''}
    `;
    
    if (order.status === 'pending') {
      document.getElementById('approve-order-btn').addEventListener('click', () => {
        approveOrder(order.id);
      });
      
      document.getElementById('reject-order-btn').addEventListener('click', () => {
        rejectOrder(order.id);
      });
      
      document.getElementById('chat-with-buyer-btn').addEventListener('click', () => {
        openChatWithUser(order.buyerId);
      });
      
      document.getElementById('chat-with-seller-btn').addEventListener('click', () => {
        openChatWithUser(order.sellerId);
      });
    }
    
    showPage(orderDetailPage);
  } catch (error) {
    console.error('Error loading order details:', error);
    alert('حدث خطأ أثناء تحميل تفاصيل الطلب');
  }
}

// Approve order
async function approveOrder(orderId) {
  try {
    const orderRef = ref(database, 'orders/' + orderId);
    await update(orderRef, {
      status: 'approved',
      updatedAt: serverTimestamp()
    });
    
    alert('تم قبول الطلب بنجاح');
    showPage(ordersPage);
    loadOrders();
  } catch (error) {
    console.error('Error approving order:', error);
    alert('حدث خطأ أثناء قبول الطلب');
  }
}

// Reject order
async function rejectOrder(orderId) {
  try {
    const orderRef = ref(database, 'orders/' + orderId);
    await update(orderRef, {
      status: 'rejected',
      updatedAt: serverTimestamp()
    });
    
    alert('تم رفض الطلب بنجاح');
    showPage(ordersPage);
    loadOrders();
  } catch (error) {
    console.error('Error rejecting order:', error);
    alert('حدث خطأ أثناء رفض الطلب');
  }
}

// Open chat with user
function openChatWithUser(userId) {
  // This would open the messages page and start a chat with the user
  alert('سيتم فتح محادثة مع المستخدم. هذه الميزة قيد التطوير.');
}

// Helper functions
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  page.classList.remove('hidden');
}

function formatDate(timestamp) {
  if (!timestamp) return 'غير معروف';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Event listeners
homeIcon.addEventListener('click', () => {
  showPage(homePage);
});

profileIcon.addEventListener('click', () => {
  const user = auth.currentUser;
  if (!user) {
    showPage(authPage);
    return;
  }
  
  userInfo.innerHTML = `
    <h2>معلومات الحساب</h2>
    <div class="user-detail">
      <i class="fas fa-user"></i>
      <span>${currentUserData.name || 'غير معروف'}</span>
    </div>
    <div class="user-detail">
      <i class="fas fa-envelope"></i>
      <span>${user.email || 'غير معروف'}</span>
    </div>
    <div class="user-detail">
      <i class="fas fa-phone"></i>
      <span>${currentUserData.phone || 'غير معروف'}</span>
    </div>
    <div class="user-detail">
      <i class="fas fa-map-marker-alt"></i>
      <span>${currentUserData.address || 'غير معروف'}</span>
    </div>
    <button id="logout-btn" class="btn" style="background: var(--danger-color); margin-top: 20px;">تسجيل الخروج</button>
  `;
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
  });
  
  showPage(profilePage);
});

closeAuthBtn.addEventListener('click', () => {
  showPage(homePage);
});

closeProfileBtn.addEventListener('click', () => {
  showPage(homePage);
});

closeMessagesBtn.addEventListener('click', () => {
  showPage(homePage);
});

closePostDetailBtn.addEventListener('click', () => {
  showPage(homePage);
});

closeOrdersBtn.addEventListener('click', () => {
  showPage(homePage);
});

closeOrderDetailBtn.addEventListener('click', () => {
  showPage(ordersPage);
});

// Login form
loginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showAuthMessage('يرجى ملء جميع الحقول', 'error');
    return;
  }
  
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in
      showAuthMessage('تم تسجيل الدخول بنجاح', 'success');
      showPage(homePage);
    })
    .catch((error) => {
      showAuthMessage(getAuthErrorMessage(error.code), 'error');
    });
});

// Signup form
signupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const phone = document.getElementById('signup-phone').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const address = document.getElementById('signup-address').value;
  
  if (!name || !phone || !email || !password) {
    showAuthMessage('يرجى ملء جميع الحقول الإلزامية', 'error');
    return;
  }
  
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      
      // Save user data to database
      const userRef = ref(database, 'users/' + user.uid);
      set(userRef, {
        name: name,
        phone: phone,
        email: email,
        address: address,
        isAdmin: false,
        createdAt: serverTimestamp()
      });
      
      showAuthMessage('تم إنشاء الحساب بنجاح', 'success');
      showPage(homePage);
    })
    .catch((error) => {
      showAuthMessage(getAuthErrorMessage(error.code), 'error');
    });
});

// Auth message helper
function showAuthMessage(message, type) {
  authMessage.textContent = message;
  authMessage.className = '';
  authMessage.classList.add(type + '-message');
}

function getAuthErrorMessage(code) {
  switch(code) {
    case 'auth/invalid-email': return 'البريد الإلكتروني غير صالح';
    case 'auth/user-disabled': return 'هذا الحساب معطل';
    case 'auth/user-not-found': return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
    case 'auth/wrong-password': return 'كلمة المرور غير صحيحة';
    case 'auth/email-already-in-use': return 'هذا البريد الإلكتروني مستخدم بالفعل';
    case 'auth/weak-password': return 'كلمة المرور ضعيفة (يجب أن تحتوي على 6 أحرف على الأقل)';
    default: return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
  }
} { onlyOnce: true });
});

// التحدث مع البائع
chatWithSellerBtn.addEventListener('click', () => {
    if (!currentOrder) return;
    
    // البحث عن بيانات البائع
    const sellerRef = ref(database, 'users/' + currentOrder.sellerId);
    onValue(sellerRef, (snapshot) => {
        if (snapshot.exists()) {
            const sellerData = snapshot.val();
            sellerData.id = currentOrder.sellerId;
            
            // فتح محادثة مع البائع
            openChat(sellerData);
            showPage(messagesPage);
            
            // إرسال رسالة تلقائية عن الطلب
            setTimeout(() => {
                messageInput.value = `مرحباً، هناك طلب جديد على منتجك: ${currentOrder.postTitle}`;
            }, 500);
        }
    }, { onlyOnce: true });
});

// فلاتر الطلبات
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadOrders(btn.dataset.filter);
    });
});

// فتح صفحة الطلبات (للإدارة فقط)
function openOrdersPage() {
    if (!currentUserData || !currentUserData.isAdmin) {
        alert('عفواً، هذه الصفحة للإدارة فقط');
        return;
    }
    
    loadOrders();
    showPage(ordersPage);
}

// إضافة أيقونة الإدارة إلى Footer
function addAdminIconToFooter() {
    const footerIcons = document.querySelector('.footer-icons');
    
    const adminIcon = document.createElement('div');
    adminIcon.className = 'icon';
    adminIcon.id = 'admin-icon';
    adminIcon.innerHTML = `
        <i class="fas fa-cog"></i>
        <span>الإدارة</span>
    `;
    
    adminIcon.addEventListener('click', openOrdersPage);
    footerIcons.appendChild(adminIcon);
}

// تحميل الرسائل والمستخدمين
function loadMessages() {
    const user = auth.currentUser;
    if (!user) return;
    
    // التحقق من صلاحية المستخدم
    const userRef = ref(database, 'users/' + user.uid);
    onValue(userRef, (userSnapshot) => {
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            const isAdmin = userData.isAdmin || false;
            
            // إظهار رسالة تحميل
            usersList.innerHTML = '<p class="no-users">جاري تحميل المحادثات...</p>';
            
            if (isAdmin) {
                // إذا كان مشرفاً، تحميل جميع المستخدمين الذين تواصلوا معهم
                loadAllUsersForAdmin(user.uid);
            } else {
                // إذا كان مستخدم عادي، تحميل الإدارة فقط
                loadAdminUsersForMessages(user.uid);
            }
        }
    }, { onlyOnce: true });
}

// تحميل جميع المستخدمين الذين تواصلوا مع الإدارة (للمشرفين)
function loadAllUsersForAdmin(currentUserId) {
    const messagesRef = ref(database, 'messages');
    onValue(messagesRef, (snapshot) => {
        usersList.innerHTML = '';
        userMessages = {};
        userUnreadCounts = {};
        userLastMessageTime = {};
        
        if (snapshot.exists()) {
            const messages = snapshot.val();
            const usersMap = new Map(); // استخدام Map لمنع التكرار
            
            // تجميع الرسائل وتحديد المستخدمين
            Object.keys(messages).forEach(messageId => {
                const message = messages[messageId];
                
                // تجاهل الرسائل التي ليس للمشرف علاقة بها
                if (message.senderId !== currentUserId && message.receiverId !== currentUserId) {
                    return;
                }
                
                // تحديد المستخدم الآخر في المحادثة
                const otherUserId = message.senderId === currentUserId ? 
                    message.receiverId : message.senderId;
                
                if (!usersMap.has(otherUserId)) {
                    usersMap.set(otherUserId, {
                        id: otherUserId,
                        messages: [],
                        unreadCount: 0,
                        lastMessageTime: 0
                    });
                }
                
                const userData = usersMap.get(otherUserId);
                userData.messages.push({
                    id: messageId,
                    ...message
                });
                
                // حساب الرسائل غير المقروءة
                if (message.receiverId === currentUserId && !message.isRead) {
                    userData.unreadCount++;
                }
                
                // تحديث وقت آخر رسالة
                if (!userData.lastMessageTime || message.timestamp > userData.lastMessageTime) {
                    userData.lastMessageTime = message.timestamp;
                }
            });
            
            // تحويل Map إلى مصفوفة وترتيبها حسب آخر رسالة
            const usersArray = Array.from(usersMap.values());
            usersArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            
            if (usersArray.length > 0) {
                // تحميل معلومات المستخدمين
                loadUsersInfo(usersArray, currentUserId);
            } else {
                usersList.innerHTML = '<p class="no-users">لا توجد محادثات بعد</p>';
            }
        } else {
            usersList.innerHTML = '<p class="no-users">لا توجد محادثات بعد</p>';
        }
    });
}

// تحميل معلومات المستخدمين للمشرف
function loadUsersInfo(usersArray, currentUserId) {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            const allUsers = snapshot.val();
            const usersToShow = [];
            
            // إضافة معلومات كل مستخدم
            usersArray.forEach(userData => {
                if (allUsers[userData.id] && userData.id !== currentUserId) {
                    usersToShow.push({
                        ...userData,
                        ...allUsers[userData.id]
                    });
                    
                    // تخزين الرسائل في الذاكرة
                    userMessages[userData.id] = userData.messages;
                    userUnreadCounts[userData.id] = userData.unreadCount;
                    userLastMessageTime[userData.id] = userData.lastMessageTime;
                }
            });
            
            // عرض قائمة المستخدمين
            displayUsersList(usersToShow, currentUserId);
        }
    }, { onlyOnce: true });
}

// تحميل الإدارة فقط للمستخدم العادي
function loadAdminUsersForMessages(currentUserId) {
    usersList.innerHTML = '';
    
    if (adminUsers.length > 0) {
        // تحميل رسائل الإدارة فقط
        loadUserMessages(adminUsers, currentUserId);
    } else {
        usersList.innerHTML = '<p class="no-users">لا توجد إدارة متاحة حالياً</p>';
    }
}

// تحميل رسائل المستخدمين
function loadUserMessages(users, currentUserId) {
    // إزالة المستمع السابق إذا كان موجوداً
    if (messagesListener) {
        messagesListener();
    }
    
    const messagesRef = ref(database, 'messages');
    messagesListener = onValue(messagesRef, (snapshot) => {
        userMessages = {};
        userUnreadCounts = {};
        
        if (snapshot.exists()) {
            const messages = snapshot.val();
            
            // تجميع الرسائل حسب المستخدم
            Object.keys(messages).forEach(messageId => {
                const message = messages[messageId];
                
                // تجاهل الرسائل التي ليس للمستخدم علاقة بها
                if (message.senderId !== currentUserId && message.receiverId !== currentUserId) {
                    return;
                }
                
                // تحديد المستخدم الآخر في المحادثة
                const otherUserId = message.senderId === currentUserId ? 
                    message.receiverId : message.senderId;
                
                if (!userMessages[otherUserId]) {
                    userMessages[otherUserId] = [];
                }
                
                userMessages[otherUserId].push({
                    id: messageId,
                    ...message
                });
                
                // حساب الرسائل غير المقروءة
                if (message.receiverId === currentUserId && !message.isRead) {
                    userUnreadCounts[otherUserId] = (userUnreadCounts[otherUserId] || 0) + 1;
                }
                
                // تحديث وقت آخر رسالة
                if (!userLastMessageTime[otherUserId] || message.timestamp > userLastMessageTime[otherUserId]) {
                    userLastMessageTime[otherUserId] = message.timestamp;
                }
            });
        }
        
        // عرض قائمة المستخدمين
        displayUsersList(users, currentUserId);
        
        // إذا كانت هناك محادثة نشطة، قم بتحديث الرسائل
        if (activeUserId) {
            displayMessages(activeUserId);
        }
    });
}

// عرض قائمة المستخدمين
function displayUsersList(users, currentUserId) {
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<p class="no-users">لا يوجد مستخدمين آخرين</p>';
        return;
    }
    
    // ترتيب المستخدمين حسب آخر رسالة
    users.sort((a, b) => {
        const timeA = userLastMessageTime[a.id] || 0;
        const timeB = userLastMessageTime[b.id] || 0;
        return timeB - timeA;
    });
    
    users.forEach(userData => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        if (userUnreadCounts[userData.id] > 0) {
            userItem.classList.add('unread');
        }
        userItem.dataset.userId = userData.id;
        
        const lastMessage = userMessages[userData.id] ? 
            userMessages[userData.id][userMessages[userData.id].length - 1] : null;
        
        const lastMessageText = lastMessage ? 
            (lastMessage.content.length > 30 ? 
                lastMessage.content.substring(0, 30) + '...' : 
                lastMessage.content) : 
            'لا توجد رسائل';
        
        const unreadCount = userUnreadCounts[userData.id] || 0;
        
        userItem.innerHTML = `
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
                <div class="user-name">${userData.name}</div>
                <div class="user-status">${lastMessageText}</div>
            </div>
            ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
        `;
        
        userItem.addEventListener('click', () => {
            openChat(userData);
        });
        
        usersList.appendChild(userItem);
    });
}

// فتح محادثة مع مستخدم
function openChat(userData) {
    activeUserId = userData.id;
    
    // التحقق من صلاحية المستخدم الحالي
    const user = auth.currentUser;
    if (user && currentUserData) {
        // عرض مؤشر الصلاحية
        displayAdminIndicator(currentUserData.isAdmin || false);
    }
    
    // تحديث واجهة المحادثة
    currentChatUser.textContent = userData.name;
    
    // تفعيل مربع الكتابة
    messageInput.disabled = false;
    sendMessageBtn.disabled = false;
    
    // عرض الرسائل
    displayMessages(userData.id);
    
    // وضع علامة على الرسائل كمقروءة
    markMessagesAsRead(userData.id);
    
    // إزالة التحديد من جميع المستخدمين وإضافته للمستخدم الحالي
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeUserItem = document.querySelector(`.user-item[data-user-id="${userData.id}"]`);
    if (activeUserItem) {
        activeUserItem.classList.add('active');
    }
}

// عرض الرسائل في المحادثة
function displayMessages(userId) {
    messagesContainer.innerHTML = '';
    
    if (!userMessages[userId] || userMessages[userId].length === 0) {
        messagesContainer.innerHTML = '<div class="no-chat-selected"><p>لا توجد رسائل بعد</p></div>';
        return;
    }
    
    // ترتيب الرسائل حسب الوقت
    const sortedMessages = userMessages[userId].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    sortedMessages.forEach(message => {
        addMessageToChat(message, userId);
    });
    
    // التمرير إلى أحدث رسالة
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// إضافة رسالة إلى الدردشة
function addMessageToChat(message, userId) {
    const messageElement = document.createElement('div');
    
    // تحديد إذا كانت الرسالة مرسلة أو مستلمة
    const isSent = message.senderId === (currentUserData ? currentUserData.uid : null);
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const date = message.timestamp ? new Date(message.timestamp) : new Date();
    const timeString = date.toLocaleTimeString('ar-EG', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageElement.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// وضع علامة على الرسائل كمقروءة
function markMessagesAsRead(userId) {
    const user = auth.currentUser;
    if (!user) return;
    
    if (userMessages[userId]) {
        userMessages[userId].forEach(message => {
            if (message.receiverId === user.uid && !message.isRead) {
                update(ref(database, 'messages/' + message.id), {
                    isRead: true
                }).then(() => {
                    // تحديث العداد بعد وضع علامة مقروء
                    userUnreadCounts[userId] = (userUnreadCounts[userId] || 1) - 1;
                    if (userUnreadCounts[userId] <= 0) {
                        userUnreadCounts[userId] = 0;
                        const badge = document.querySelector(`.user-item[data-user-id="${userId}"] .unread-badge`);
                        if (badge) {
                            badge.remove();
                        }
                    }
                });
            }
        });
    }
}

// إرسال رسالة مع التحقق من الصلاحية
sendMessageBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (!message || !activeUserId) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    // التحقق من أن المستخدم يرسل للإدارة فقط (إذا لم يكن مشرفاً)
    if (!currentUserData.isAdmin) {
        const isReceivingAdmin = adminUsers.some(admin => admin.id === activeUserId);
        if (!isReceivingAdmin) {
            alert('يمكنك التواصل مع الإدارة فقط');
            return;
        }
    }
    
    sendMessageToUser(message, user, activeUserId);
});

// دالة منفصلة لإرسال الرسالة
function sendMessageToUser(message, user, receiverId) {
    const newMessage = {
        senderId: user.uid,
        receiverId: receiverId,
        content: message,
        timestamp: serverTimestamp(),
        isRead: false
    };
    
    push(ref(database, 'messages'), newMessage)
        .then(() => {
            messageInput.value = '';
            
            // إضافة الرسالة فوراً إلى الواجهة
            if (activeUserId === receiverId) {
                addMessageToChat({
                    ...newMessage,
                    timestamp: Date.now()
                }, receiverId);
                
                // التمرير إلى الأسفل لعرض الرسالة الجديدة
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // تحديث وقت آخر رسالة
            userLastMessageTime[receiverId] = Date.now();
            
            // إعادة تحميل قائمة المستخدمين للمشرفين
            if (currentUserData.isAdmin) {
                loadAllUsersForAdmin(user.uid);
            } else {
                sortUsersList();
            }
        })
        .catch(error => {
            alert('حدث خطأ أثناء إرسال الرسالة: ' + error.message);
        });
}

// ترتيب قائمة المستخدمين
function sortUsersList() {
    const userItems = Array.from(usersList.querySelectorAll('.user-item'));
    
    userItems.sort((a, b) => {
        const userIdA = a.dataset.userId;
        const userIdB = b.dataset.userId;
        const timeA = userLastMessageTime[userIdA] || 0;
        const timeB = userLastMessageTime[userIdB] || 0;
        return timeB - timeA;
    });
    
    // إعادة إضافة العناصر بالترتيب الجديد
    userItems.forEach(item => {
        usersList.appendChild(item);
    });
}

// عرض مؤشر الصلاحية في واجهة الرسائل
function displayAdminIndicator(isAdmin) {
    const chatHeader = document.getElementById('chat-header');
    
    if (isAdmin) {
        if (!document.getElementById('admin-badge')) {
            const adminBadge = document.createElement('span');
            adminBadge.id = 'admin-badge';
            adminBadge.className = 'admin-badge';
            adminBadge.innerHTML = '<i class="fas fa-crown"></i> مشرف';
            adminBadge.style.marginRight = '10px';
            adminBadge.style.background = 'var(--warning-color)';
            adminBadge.style.color = 'white';
            adminBadge.style.padding = '5px 10px';
            adminBadge.style.borderRadius = '15px';
            adminBadge.style.fontSize = '0.8rem';
            
            chatHeader.insertBefore(adminBadge, currentChatUser);
        }
    } else {
        const adminBadge = document.getElementById('admin-badge');
        if (adminBadge) {
            adminBadge.remove();
        }
    }
}

// وظائف مساعدة
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    page.classList.remove('hidden');
}

function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = '';
    authMessage.classList.add(type + '-message');
}

function getAuthErrorMessage(code) {
    switch(code) {
        case 'auth/invalid-email':
            return 'البريد الإلكتروني غير صالح';
        case 'auth/user-disabled':
            return 'هذا الحساب معطل';
        case 'auth/user-not-found':
            return 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني';
        case 'auth/wrong-password':
            return 'كلمة المرور غير صحيحة';
        case 'auth/email-already-in-use':
            return 'هذا البريد الإلكتروني مستخدم بالفعل';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة (يجب أن تحتوي على 6 أحرف على الأقل)';
        default:
            return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
    }
}

function resetAddPostForm() {
    document.getElementById('post-title').value = '';
    document.getElementById('post-description').value = '';
    document.getElementById('post-price').value = '';
    document.getElementById('post-location').value = '';
    document.getElementById('post-phone').value = '';
    postImageInput.value = '';
    imageName.textContent = 'لم يتم اختيار صورة';
    imagePreview.classList.add('hidden');
}

function resetAuthForms() {
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-phone').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-address').value = '';
    authMessage.textContent = '';
    authMessage.className = '';
}

function formatDate(timestamp) {
    if (!timestamp) return 'غير معروف';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'اليوم ' + date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (diffDays === 1) {
        return 'أمس ' + date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (diffDays < 7) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[date.getDay()] + ' ' + date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// إضافة مستمعي الأحداث للأزرار الجديدة
closeOrdersBtn.addEventListener('click', () => {
    showPage(homePage);
    if (ordersListener) {
        ordersListener();
        ordersListener = null;
    }
});

closeOrderDetailBtn.addEventListener('click', () => {
    showPage(ordersPage);
});

// تسجيل الدخول
loginBtn.addEventListener('click', e => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAuthMessage('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            showAuthMessage('تم تسجيل الدخول بنجاح!', 'success');
            setTimeout(() => {
                showPage(homePage);
                resetAuthForms();
            }, 1500);
        })
        .catch(error => {
            showAuthMessage(getAuthErrorMessage(error.code), 'error');
        });
});

// إنشاء حساب
signupBtn.addEventListener('click', e => {
    e.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const address = document.getElementById('signup-address').value;
    
    if (!name || !phone || !email || !password || !address) {
        showAuthMessage('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            const user = userCredential.user;
            
            // حفظ معلومات المستخدم الإضافية
            return set(ref(database, 'users/' + user.uid), {
                name: name,
                phone: phone,
                email: email,
                address: address,
                isAdmin: false,
                createdAt: serverTimestamp()
            });
        })
        .then(() => {
            showAuthMessage('تم إنشاء الحساب بنجاح!', 'success');
            setTimeout(() => {
                showPage(homePage);
                resetAuthForms();
            }, 1500);
        })
        .catch(error => {
            showAuthMessage(getAuthErrorMessage(error.code), 'error');
        });
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        showPage(homePage);
        // إزالة مستمع الرسائل عند تسجيل الخروج
        if (messagesListener) {
            messagesListener();
            messagesListener = null;
        }
    });
});



// عرض معلومات المستخدم
profileIcon.addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (user) {
        // عرض صفحة حساب المستخدم
        const userRef = ref(database, 'users/' + user.uid);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                userInfo.innerHTML = `
                    <div class="user-detail">
                        <i class="fas fa-user"></i>
                        <span>${userData.name}</span>
                    </div>
                    <div class="user-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${userData.email}</span>
                    </div>
                    <div class="user-detail">
                        <i class="fas fa-phone"></i>
                        <span>${userData.phone}</span>
                    </div>
                    <div class="user-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${userData.address}</span>
                    </div>
                `;
            } else {
                userInfo.innerHTML = '<p>لا توجد بيانات للمستخدم</p>';
            }
            showPage(profilePage);
        }, { onlyOnce: true });
    } else {
        // عرض صفحة التوثيق
        showPage(authPage);
    }
});

// إضافة منشور جديد
addPostIcon.addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (user) {
        resetAddPostForm();
        showPage(addPostPage);
    } else {
        showPage(authPage);
    }
});

// فتح صفحة الرسائل
messagesIcon.addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (user) {
        loadMessages();
        showPage(messagesPage);
    } else {
        showPage(authPage);
    }
});

// العودة للصفحة الرئيسية
homeIcon.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة التوثيق
closeAuthBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة إضافة المنشور
closeAddPostBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة الملف الشخصي
closeProfileBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة الرسائل
closeMessagesBtn.addEventListener('click', () => {
    showPage(homePage);
    // إزالة مستمع الرسائل عند إغلاق الصفحة
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
});

// إغلاق صفحة تفاصيل المنشور
closePostDetailBtn.addEventListener('click', () => {
    showPage(homePage);
});

// تغيير علامات التوثيق
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (btn.dataset.tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    });
});

// اختيار صورة من المعرض
chooseImageBtn.addEventListener('click', () => {
    postImageInput.click();
});

// فتح الكاميرا (إذا كان الجهاز يدعمها)
cameraBtn.addEventListener('click', () => {
    postImageInput.setAttribute('capture', 'environment');
    postImageInput.click();
});

// عرض معاينة الصورة
postImageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        imageName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});

// إزالة الصورة المختارة
removeImageBtn.addEventListener('click', () => {
    postImageInput.value = '';
    imageName.textContent = 'لم يتم اختيار صورة';
    imagePreview.classList.add('hidden');
});>
                    </div>
                    <div class="user-detail">
                        <i class="fas fa-phone"></i>
                        <span>${userData.phone}</span>
                    </div>
                    <div class="user-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${userData.address}</span>
                    </div>
                `;
            } else {
                userInfo.innerHTML = '<p>لا توجد بيانات للمستخدم</p>';
            }
            showPage(profilePage);
        }, { onlyOnce: true });
    } else {
        // عرض صفحة التوثيق
        showPage(authPage);
    }
});

// إضافة منشور جديد
addPostIcon.addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (user) {
        resetAddPostForm();
        showPage(addPostPage);
    } else {
        showPage(authPage);
    }
});

// فتح صفحة الرسائل
messagesIcon.addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (user) {
        loadMessages();
        showPage(messagesPage);
    } else {
        showPage(authPage);
    }
});

// العودة للصفحة الرئيسية
homeIcon.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة التوثيق
closeAuthBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة إضافة المنشور
closeAddPostBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة الملف الشخصي
closeProfileBtn.addEventListener('click', () => {
    showPage(homePage);
});

// إغلاق صفحة الرسائل
closeMessagesBtn.addEventListener('click', () => {
    showPage(homePage);
    // إزالة مستمع الرسائل عند إغلاق الصفحة
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
});

// إغلاق صفحة تفاصيل المنشور
closePostDetailBtn.addEventListener('click', () => {
    showPage(homePage);
});

// تغيير علامات التوثيق
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (btn.dataset.tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    });
});

// اختيار صورة من المعرض
chooseImageBtn.addEventListener('click', () => {
    postImageInput.click();
});

// فتح الكاميرا (إذا كان الجهاز يدعمها)
cameraBtn.addEventListener('click', () => {
    postImageInput.setAttribute('capture', 'environment');
    postImageInput.click();
});

// عرض معاينة الصورة
postImageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        imageName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});

// إزالة الصورة المختارة
removeImageBtn.addEventListener('click', () => {
    postImageInput.value = '';
    imageName.textContent = 'لم يتم اختيار صورة';
    imagePreview.classList.add('hidden');
});'click', () => {
    postImageInput.click();
});

// فتح الكاميرا (إذا كان الجهاز يدعمها)
cameraBtn.addEventListener('click', () => {
    postImageInput.setAttribute('capture', 'environment');
    postImageInput.click();
});

// عرض معاينة الصورة
postImageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        imageName.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    }
});

// إزالة الصورة المختارة
removeImageBtn.addEventListener('click', () => {
    postImageInput.value = '';
    imageName.textContent = 'لم يتم اختيار صورة';
    imagePreview.classList.add('hidden');
});