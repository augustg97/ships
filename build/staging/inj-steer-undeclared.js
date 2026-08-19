/* prove round 121's steering rule convicts an UNDECLARED record: the fluyt's
   hull.steering is deleted from the data before the audit reads it. The builder
   falls back to the build-string guess and still draws her stern rudder, so the
   ONLY conviction must be 'record declares no steering', once, on the fluyt —
   the geometry rules all stay silent because the drawn ship is unchanged. */
(() => {
  const list = APP.vessels.vessels || APP.vessels;
  delete list.find(v => v.id === 'fluyt').hull.steering;
})();
