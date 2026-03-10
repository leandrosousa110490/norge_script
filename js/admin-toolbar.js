document.addEventListener('DOMContentLoaded', function () {
  var path = String(window.location.pathname || '').toLowerCase();
  var authUser = String(sessionStorage.getItem('ADMIN_AUTH_USER') || '').trim();

  var userBadges = document.querySelectorAll('#adminToolbarUser, .admin-toolbar-user');
  userBadges.forEach(function (node) {
    if (!node) return;
    node.innerHTML = '<span class="admin-toolbar-pulse" aria-hidden="true"></span><span>' + (authUser || 'Guest') + '</span>';
  });

  document.querySelectorAll('.admin-nav-link').forEach(function (link) {
    var href = String(link.getAttribute('href') || '').toLowerCase();
    if (!href) return;
    var page = href.replace('./', '');
    if (path.endsWith('/admin/' + page) || path.endsWith('/admin/' + page.replace('.html', ''))) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('[data-admin-logout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sessionStorage.removeItem('ADMIN_AUTH');
      sessionStorage.removeItem('ADMIN_AUTH_USER');
      window.location.href = './index.html';
    });
  });
});
