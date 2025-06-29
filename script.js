const API_URL = 'https://confessy-backend.onrender.com/api';

// Helpers
async function postData(url = '', data = {}) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    alert('Erreur réseau (POST): ' + err.message);
    throw err;
  }
}

async function getData(url = '') {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err) {
    alert('Erreur réseau (GET): ' + err.message);
    throw err;
  }
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

// === Connexion ===
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInput = loginForm.userInput.value.trim();
    const password = loginForm.password.value.trim();
    if (!userInput || !password) return alert('Veuillez remplir tous les champs');
    try {
      const data = await postData(`${API_URL}/auth/login`, { userInput, password });
      alert('Réponse login: ' + JSON.stringify(data));
      if (data.success) {
        saveUser(data.user);
        window.location.href = 'home.html';
      } else {
        alert(data.error || 'Erreur de connexion');
      }
    } catch {
      // Erreur déjà affichée dans postData
    }
  });
}

// === Inscription ===
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contact = registerForm.contact.value.trim();
    const password = registerForm.password.value.trim();
    if (!contact || !password) return alert('Tous les champs sont requis');
    try {
      const data = await postData(`${API_URL}/auth/register`, { contact, password });
      alert('Réponse inscription: ' + JSON.stringify(data));
      if (data.success) {
        saveUser(data.user);
        window.location.href = 'choose-username.html';
      } else {
        alert(data.error || 'Erreur lors de l\'inscription');
      }
    } catch {
      // Erreur déjà affichée
    }
  });
}

// === Choix pseudo / anonymat ===
const identityForm = document.getElementById('identityForm');
if (identityForm) {
  identityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = identityForm.username.value.trim();
    const anonymous = identityForm.anonymous.checked;
    const user = getUser();
    if (!anonymous && !username) return alert('Choisissez un pseudo ou cochez anonymat');
    if (!user) {
      alert('Session expirée. Veuillez vous inscrire à nouveau.');
      return window.location.href = 'register.html';
    }
    try {
      const data = await postData(`${API_URL}/auth/set-username`, {
        userId: user._id,
        username: anonymous ? null : username,
        isAnonymous: anonymous,
      });
      alert('Réponse pseudo: ' + JSON.stringify(data));
      if (data.success) {
        clearUser();
        alert('Inscription terminée ! Connectez-vous.');
        window.location.href = 'index.html';
      } else {
        alert(data.error || 'Erreur lors de la validation');
      }
    } catch {
      // Erreur déjà affichée
    }
  });
}

// === Fil d’actualités (home.html) ===
const feed = document.getElementById('feed');
const btnPost = document.getElementById('btnPost');
const btnProfile = document.getElementById('btnProfile');

if (feed) {
  const user = getUser();
  if (!user) {
    alert('Veuillez vous connecter.');
    window.location.href = 'index.html';
  } else {
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
      } catch (err) {
        alert('Erreur de chargement du fil.');
        console.error(err);
      }
    }
    loadFeed();

    if (btnPost) btnPost.onclick = () => window.location.href = 'post.html';
    if (btnProfile) btnProfile.onclick = () => window.location.href = 'profile.html';
  }
}

// === Poster une confession (post.html) ===
const postForm = document.getElementById('postForm');
if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postForm.content.value.trim();
    const user = getUser();
    if (!content) return alert('Écris quelque chose');
    if (!user) {
      alert('Veuillez vous connecter');
      window.location.href = 'index.html';
      return;
    }
    try {
      const data = await postData(`${API_URL}/confessions`, {
        userId: user._id,
        username: user.username,
        anonymous: user.isAnonymous,
        content,
      });
      alert('Réponse post confession: ' + JSON.stringify(data));
      if (data.success) {
        alert('Confession postée !');
        window.location.href = 'home.html';
      } else {
        alert(data.error || 'Erreur lors de la publication');
      }
    } catch {
      // Erreur déjà affichée
    }
  });
}

// === Profil (profile.html) ===
const profileForm = document.getElementById('profileForm');
const btnLogout = document.getElementById('btnLogout');
const btnDeleteAccount = document.getElementById('btnDeleteAccount');
const myConfessions = document.getElementById('userConfessions');
const btnHome = document.getElementById('btnHome');

if (profileForm || btnLogout || btnDeleteAccount || myConfessions || btnHome) {
  const user = getUser();
  if (!user) {
    alert('Veuillez vous connecter.');
    window.location.href = 'index.html';
  } else {
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
          alert('Réponse mise à jour profil: ' + JSON.stringify(data));
          if (data.success) {
            alert('Profil mis à jour');
            saveUser({ ...user, username: anonymous ? null : username, isAnonymous: anonymous });
          } else {
            alert(data.error || 'Erreur lors de la mise à jour');
          }
        } catch {
          // Erreur déjà affichée
        }
      });
    }

    // Charger mes confessions
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
            myConfessions.innerHTML = '<p>Vous n\'avez aucune confession postée.</p>';
          }
        } catch (err) {
          alert('Erreur lors du chargement de vos confessions');
          console.error(err);
        }
      }
      loadMyConfessions();
    }

    // Boutons
    if (btnLogout) {
      btnLogout.onclick = () => {
        clearUser();
        window.location.href = 'index.html';
      };
    }
    if (btnDeleteAccount) {
      btnDeleteAccount.onclick = async () => {
        if (!confirm('Supprimer votre compte ? Cette action est irréversible.')) return;
        try {
          const data = await postData(`${API_URL}/users/${user._id}/delete`);
          alert('Réponse suppression compte: ' + JSON.stringify(data));
          if (data.success) {
            clearUser();
            alert('Compte supprimé');
            window.location.href = 'index.html';
          } else {
            alert(data.error || 'Erreur lors de la suppression');
          }
        } catch {
          // Erreur déjà affichée
        }
      };
    }
    if (btnHome) btnHome.onclick = () => window.location.href = 'home.html';
  }
}

// === Fonctions placeholders ===
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
