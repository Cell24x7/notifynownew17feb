const express = require('express');
try {
  const router = require('./routes/rcs');
  console.log('Router loaded successfully');
  const routes = router.stack.filter(r => r.route).map(r => r.route.path);
  console.log('Routes:', routes);
} catch (e) {
  console.error('Error loading router:', e);
}
