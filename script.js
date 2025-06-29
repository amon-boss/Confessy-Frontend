const API_URL = 'https://confessy-backend-dq5t.onrender.com/api';

// === UTILS ===
async function postData(url = '', data = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function getData(url = '') {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

function saveUser(user) {
  localStorage.setItem('confessyUser', JSON.stringify(user));
}

function getUser() {
  const user = localStorage.getItem('confessyUser');
  return user ? JSON.parse(user) : null;
}

function clearUser() {
  localStorage.removeItem('confessyUser');
}

// === LOGIN ===
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInput = loginForm.userInput.value.trim();
    const password = loginForm.password.value.trim();
    if (!userInput || !password) return alert('Veuillez remplir tous les champs');
    try {
      const data = await postData(`${API_URL}/auth/login`, { userInput, password });
      if (data.success) {
        saveUser(data.user);
        if (!data.user.username && !data.user.isAnonymous) {
          window.location.href = 'choose-username.html';
        } else {
          window.location.href = 'home.html';
        }
      } else {
        alert(data.error || 'Erreur de connexion');
      }
    } catch (err) {
      alert('Erreur réseau (connexion) : ' + err.message);
    }
  });
}

// === REGISTER ===
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contact = registerForm.contact.value.trim();
    const password = registerForm.password.value.trim();
    if (!contact || !password) return alert('Tous les champs sont requis');
    try {
      const data = await postData(`${API_URL}/auth/register`, { contact, password });
      if (data.success) {
        saveUser(data.user);
        window.location.href = 'choose-username.html';
      } else {
        alert(data.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      alert('Erreur réseau (inscription) : ' + err.message);
    }
  });
}

// === CHOIX DU PSEUDO ===
const identityForm = document.getElementById('identityForm');
if (identityForm) {
  identityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = identityForm.username.value.trim();
    const anonymous = identityForm.anonymous.checked;
    const user = getUser();
    if (!user) return (window.location.href = 'register.html');
    if (!anonymous && !username) return alert('Choisissez un pseudo ou cochez anonymat');
    try {
      const data = await postData(`${API_URL}/auth/set-username`, {
        userId: user._id,
        username: anonymous ? null : username,
        isAnonymous: anonymous,
      });
      if (data.success) {
        clearUser();
        alert('Inscription terminée !');
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Erreur de validation');
      }
    } catch (err) {
      alert('Erreur réseau (set username) : ' + err.message);
    }
  });
}

// === HOME FEED ===
const feed = document.getElementById('feed');
const btnPost = document.getElementById('btnPost');
const btnProfile = document.getElementById('btnProfile');

if (feed) {
  const user = getUser();
  if (!user) return (window.location.href = 'index.html');
  async function loadFeed() {
    try {
      const data = await getData(`${API_URL}/confessions`);
      feed.innerHTML = '';
      data.forEach((confession) => {
        const name = confession.anonymous ? 'Anonyme' : confession.username || 'Utilisateur';
        const post = document.createElement('div');
        post.className = 'post';
        post.innerHTML = `
          <div class="post-header">${name}</div>
          <div class="post-content">${confession.content}</div>
          <div class="post-actions">
            <button onclick="likePost('${confession._id}')">👍 ${confession.likes?.length || 0}</button>
            <button onclick="commentPost('${confession._id}')">💬</button>
            <button onclick="sharePost('${confession._id}')">🔗</button>
          </div>`;
        feed.appendChild(post);
      });
    } catch {
      feed.innerHTML = '<p>Erreur de chargement</p>';
    }
  }
  loadFeed();
  if (btnPost) btnPost.onclick = () => (window.location.href = 'post.html');
  if (btnProfile) btnProfile.onclick = () => (window.location.href = 'profile.html');
}

// === POSTER CONFESSION ===
const postForm = document.getElementById('postForm');
if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postForm.content.value.trim();
    const user = getUser();
    if (!content) return alert('Écris quelque chose');
    if (!user) return (window.location.href = 'index.html');
    try {
      const data = await postData(`${API_URL}/confessions`, {
        userId: user._id,
        username: user.username,
        anonymous: user.isAnonymous,
        content,
      });
      if (data.success) {
        alert('Confession postée !');
        window.location.href = 'home.html';
      } else alert(data.error || 'Erreur');
    } catch {
      alert('Erreur réseau');
    }
  });
}

// === PROFIL UTILISATEUR ===
const profileForm = document.getElementById('profileForm');
const btnLogout = document.getElementById('btnLogout');
const btnDeleteAccount = document.getElementById('btnDeleteAccount');
const myConfessions = document.getElementById('userConfessions');
const btnHome = document.getElementById('btnHome');

if (profileForm || btnLogout || btnDeleteAccount || myConfessions || btnHome) {
  const user = getUser();
  if (!user) return (window.location.href = 'index.html');

  // Remplir profil
  if (profileForm) {
    profileForm.username.value = user.username || '';
    profileForm.anonymous.checked = user.isAnonymous;
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = profileForm.username.value.trim();
      const anonymous = profileForm.anonymous.checked;
      try {
        const data = await postData(`${API_URL}/users/${user._id}/update`, {
          username: anonymous ? null : username,
          isAnonymous: anonymous,
        });
        if (data.success) {
          alert('Profil mis à jour');
          saveUser({ ...user, username, isAnonymous: anonymous });
        } else alert(data.error || 'Erreur de mise à jour');
      } catch {
        alert('Erreur réseau');
      }
    });
  }

  // Mes confessions
  if (myConfessions) {
    async function loadMyConfessions() {
      try {
        const data = await getData(`${API_URL}/users/${user._id}/confessions`);
        myConfessions.innerHTML = '';
        if (data.success && Array.isArray(data.confessions) && data.confessions.length > 0) {
          data.confessions.forEach((c) => {
            const el = document.createElement('div');
            el.className = 'post';
            el.innerHTML = `
              <div class="post-content">${c.content}</div>
              <div class="post-actions">
                <button onclick="editConfession('${c._id}')">Modifier</button>
                <button onclick="deleteConfession('${c._id}')">Supprimer</button>
              </div>`;
            myConfessions.appendChild(el);
          });
        } else {
          myConfessions.innerHTML = '<p>Vous n’avez aucune confession postée.</p>';
        }
      } catch {
        myConfessions.innerHTML = '<p>Erreur lors du chargement</p>';
      }
    }
    loadMyConfessions();
  }

  if (btnLogout) btnLogout.onclick = () => {
    clearUser();
    window.location.href = 'index.html';
  };

  if (btnDeleteAccount) btnDeleteAccount.onclick = async () => {
    if (!confirm('Supprimer votre compte ?')) return;
    try {
      const data = await postData(`${API_URL}/users/${user._id}/delete`);
      if (data.success) {
        clearUser();
        alert('Compte supprimé');
        window.location.href = 'index.html';
      } else alert(data.error || 'Erreur');
    } catch {
      alert('Erreur réseau');
    }
  };

  if (btnHome) btnHome.onclick = () => window.location.href = 'home.html';
}

// === BOUTONS PLACEHOLDER ===
function likePost(id) {
  alert('Like à venir');
}
function commentPost(id) {
  alert('Commentaires à venir');
}
function sharePost(id) {
  const url = `${window.location.origin}/home.html?post=${id}`;
  navigator.clipboard.writeText(url).then(() => alert('Lien copié !'));
}
function editConfession(id) {
  alert('Modification à venir');
}
function deleteConfession(id) {
  alert('Suppression à venir');
          }
