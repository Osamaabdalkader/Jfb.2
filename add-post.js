// Import Firebase functions
import { 
  auth, database, storage, 
  ref, push, set, serverTimestamp,
  storageRef, uploadBytesResumable, getDownloadURL,
  onAuthStateChanged 
} from './firebase.js';

// Get DOM elements
const addPostForm = document.getElementById('add-post-form');
const postImageInput = document.getElementById('post-image');
const chooseImageBtn = document.getElementById('choose-image-btn');
const cameraBtn = document.getElementById('camera-btn');
const imageName = document.getElementById('image-name');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const removeImageBtn = document.getElementById('remove-image-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const uploadProgress = document.getElementById('upload-progress');

// Check user authentication state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Redirect to index.html if not logged in
    localStorage.setItem('redirectUrl', 'add-post.html');
    window.location.href = 'index.html';
    return;
  }
  
  // User is logged in, we can proceed
  console.log('User is logged in:', user.uid);
});

// Choose image from gallery
chooseImageBtn.addEventListener('click', () => {
  postImageInput.removeAttribute('capture');
  postImageInput.click();
});

// Open camera
cameraBtn.addEventListener('click', () => {
  postImageInput.setAttribute('capture', 'environment');
  postImageInput.click();
});

// Display image preview
postImageInput.addEventListener('change', function() {
  if (this.files && this.files[0]) {
    const file = this.files[0];
    imageName.textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      imagePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
});

// Remove selected image
removeImageBtn.addEventListener('click', () => {
  postImageInput.value = '';
  imageName.textContent = 'لم يتم اختيار صورة';
  imagePreview.classList.add('hidden');
});

// Handle form submission
addPostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    alert('يجب تسجيل الدخول أولاً');
    window.location.href = 'index.html';
    return;
  }
  
  const title = document.getElementById('post-title').value;
  const description = document.getElementById('post-description').value;
  const price = document.getElementById('post-price').value;
  const location = document.getElementById('post-location').value;
  const phone = document.getElementById('post-phone').value;
  const imageFile = postImageInput.files[0];
  
  if (!title || !description || !phone) {
    alert('يرجى ملء جميع الحقول الإلزامية');
    return;
  }
  
  try {
    loadingOverlay.classList.remove('hidden');
    let imageUrl = '';
    
    // Upload image if selected
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }
    
    // Save post to database
    await savePostToDatabase(user.uid, title, description, price, location, phone, imageUrl);
    
    alert('تم نشر المنشور بنجاح!');
    addPostForm.reset();
    imagePreview.classList.add('hidden');
    loadingOverlay.classList.add('hidden');
    
    // Redirect to home page after 2 seconds
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error adding post:', error);
    alert('حدث خطأ أثناء إضافة المنشور: ' + error.message);
    loadingOverlay.classList.add('hidden');
  }
});

// Upload image to Firebase Storage
async function uploadImage(imageFile) {
  return new Promise((resolve, reject) => {
    const storageReference = storageRef(storage, 'posts/' + Date.now() + '_' + imageFile.name);
    const uploadTask = uploadBytesResumable(storageReference, imageFile);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        uploadProgress.style.width = progress + '%';
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Save post to Firebase Database
async function savePostToDatabase(userId, title, description, price, location, phone, imageUrl) {
  try {
    const postsRef = ref(database, 'posts');
    const newPostRef = push(postsRef);
    
    await set(newPostRef, {
      id: newPostRef.key,
      authorId: userId,
      title: title,
      description: description,
      price: price || 'غير محدد',
      location: location || 'غير محدد',
      phone: phone,
      imageUrl: imageUrl || '',
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
}add('hidden');
    loadingOverlay.classList.add('hidden');
    
    // العودة إلى الصفحة الرئيسية بعد ثانيتين
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error saving post:', error);
    alert('حدث خطأ أثناء حفظ المنشور: ' + error.message);
    loadingOverlay.classList.add('hidden');
  }
}        try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

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
        selectedImageFile = file;
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
    selectedImageFile = null;
});

// عرض رسائل التنبيه
function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = '';
    authMessage.classList.add(type + '-message');
    authMessage.classList.remove('hidden');
    
    // إخفاء الرسالة بعد 5 ثوانٍ
    setTimeout(() => {
        authMessage.classList.add('hidden');
    }, 5000);
}