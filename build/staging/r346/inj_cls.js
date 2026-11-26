(() => { for (const v of (APP.vessels.vessels || APP.vessels)) if (v.hull && v.hull.capstan && v.hull.capstan.form !== 'spill' && !v.hull.capstan.stations) v.hull.capstan.atU = 0.62; return 1; })()
