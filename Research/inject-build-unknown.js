/* Injection proof for 'build tradition unknown': give every hull a bogus build key. */
(APP.vessels.vessels || APP.vessels).forEach(v => {
  if (v.hull && v.hull.build) v.hull.build = 'papier-mache';
});
