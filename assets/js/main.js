/* ═══════════════════════════════════════════
   Makki Masjid Tokyo — Shared JS (jQuery)
═══════════════════════════════════════════ */
$(function () {

  /* ── Live Clock (Tokyo) ─────────────────── */
  function updateClock() {
    const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const h = String(t.getHours()).padStart(2, '0');
    const m = String(t.getMinutes()).padStart(2, '0');
    const s = String(t.getSeconds()).padStart(2, '0');
    $('#live-clock').text(`${h}:${m}:${s}`);
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* ── Hijri Date ─────────────────────────── */
  function toHijri(date) {
    const jd = Math.floor(date.getTime() / 86400000 + 2440587.5);
    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
              Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const mo = Math.floor((24 * l) / 709);
    const dy = l - Math.floor((709 * mo) / 24);
    const yr = 30 * n + j - 30;
    const months = ['Muharram','Safar','Rabi\' al-Awwal','Rabi\' al-Thani',
      'Jumada al-Awwal','Jumada al-Thani','Rajab','Sha\'ban',
      'Ramadan','Shawwal','Dhu al-Qi\'dah','Dhu al-Hijjah'];
    return `${dy} ${months[mo - 1]} ${yr} AH`;
  }
  $('#hijri-date-bar').text(toHijri(new Date()));

  /* ── Prayer Times Calculation ───────────── */
  function calcPrayerTimes(lat, lng, timezone) {
    lat = lat || 35.7437; lng = lng || 139.8500; timezone = timezone || 9;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const D = 2 * Math.PI / 365 * (doy - 1);
    const dec = 0.006918 - 0.399912 * Math.cos(D) + 0.070257 * Math.sin(D)
              - 0.006758 * Math.cos(2 * D) + 0.000907 * Math.sin(2 * D);
    const eqT = 229.18 * (0.000075 + 0.001868 * Math.cos(D) - 0.032077 * Math.sin(D)
              - 0.014615 * Math.cos(2 * D) - 0.04089 * Math.sin(2 * D));
    const latR = lat * Math.PI / 180;
    const noon = 0.5 - eqT / 1440 - (lng - timezone * 15) / 360;

    function ha(alt) {
      const a = alt * Math.PI / 180;
      return Math.acos((Math.sin(a) - Math.sin(latR) * Math.sin(dec)) /
             (Math.cos(latR) * Math.cos(dec))) * 180 / Math.PI;
    }

    const sr_ha   = ha(-0.8333);
    const fajr_ha = ha(-18);
    const isha_ha = ha(-17);
    const asr_ha_rad = Math.atan(1 / (1 + Math.tan(Math.abs(latR - dec))));
    const asr_ha  = Math.acos((Math.sin(asr_ha_rad) - Math.sin(latR)*Math.sin(dec)) /
                   (Math.cos(latR)*Math.cos(dec))) * 180 / Math.PI;

    const fajr   = noon - fajr_ha / 360;
    const sunrise= noon - sr_ha  / 360;
    const dhuhr  = noon + 0.0007;
    const asr    = noon + asr_ha  / 360;
    const maghrib= noon + sr_ha   / 360;
    const isha   = noon + isha_ha / 360;

    function fmt(f, add) {
      add = add || 0;
      const total = (f + add / 1440) * 24;
      let hr = Math.floor(total) % 24;
      const mn = Math.floor((total - Math.floor(total)) * 60);
      const ap = hr >= 12 ? 'PM' : 'AM';
      if (hr > 12) hr -= 12; if (hr === 0) hr = 12;
      return `${hr}:${String(mn).padStart(2, '0')} ${ap}`;
    }

    // Iqama = athan + offset minutes
    return [
      { name:'Fajr',    athan:fmt(fajr),    iqama:fmt(fajr,   20), frac:fajr   },
      { name:'Sunrise', athan:fmt(sunrise),  iqama:null,            frac:sunrise},
      { name:'Dhuhr',   athan:fmt(dhuhr),    iqama:fmt(dhuhr,  15), frac:dhuhr  },
      { name:'Asr',     athan:fmt(asr),      iqama:fmt(asr,    15), frac:asr    },
      { name:'Maghrib', athan:fmt(maghrib),  iqama:fmt(maghrib, 5), frac:maghrib},
      { name:'Isha',    athan:fmt(isha),     iqama:fmt(isha,   15), frac:isha   },
    ];
  }

  const prayers = calcPrayerTimes();

  // Determine next prayer
  const tnow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const nowFrac = (tnow.getHours() * 3600 + tnow.getMinutes() * 60 + tnow.getSeconds()) / 86400;
  let nextIdx = prayers.findIndex((p, i) => p.frac > nowFrac && p.name !== 'Sunrise');
  if (nextIdx === -1) nextIdx = 0;

  /* ── Prayer Bar (top strip) ─────────────── */
  if ($('#prayer-bar').length) {
    const html = prayers.map((p, i) => {
      const isNext = i === nextIdx;
      return `<div class="pb-item ${isNext ? 'is-next' : ''}">
        <span class="pb-name">${p.name} ${isNext ? '<span class="next-badge">NEXT</span>' : ''}</span>
        <span class="pb-time">${p.athan}</span>
      </div>`;
    }).join('');
    $('#prayer-bar').html(html);
  }

  /* ── Prayer Table (prayer-times page) ───── */
  if ($('#prayer-table-body').length) {
    const rows = prayers.map((p, i) => {
      const isNext = i === nextIdx;
      return `<tr class="${isNext ? 'is-next' : ''}">
        <td><strong>${p.name}</strong></td>
        <td>${p.athan}</td>
        <td>${p.iqama ? p.iqama : '<span class="text-muted">—</span>'}</td>
      </tr>`;
    }).join('');
    $('#prayer-table-body').html(rows);
    $('#pt-today-date').text(
      new Date().toLocaleDateString('en-US', {
        timeZone:'Asia/Tokyo', weekday:'long', year:'numeric', month:'long', day:'numeric'
      })
    );
  }

  /* ── Next Prayer Countdown ──────────────── */
  if ($('#cd-h').length) {
    const np = prayers[nextIdx];
    $('#next-prayer-name').text(np.name);
    $('#next-prayer-iqama').text(np.iqama || np.athan);

    function updateNPC() {
      const nowMs = new Date(new Date().toLocaleString('en-US', { timeZone:'Asia/Tokyo' })).getTime();
      const tod = new Date(new Date().toLocaleString('en-US', { timeZone:'Asia/Tokyo' }));
      tod.setHours(0,0,0,0);
      let tgt = tod.getTime() + np.frac * 86400000;
      if (tgt < nowMs) tgt += 86400000;
      const diff = Math.max(0, tgt - nowMs);
      $('#cd-h').text(String(Math.floor(diff / 3600000)).padStart(2,'0'));
      $('#cd-m').text(String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0'));
      $('#cd-s').text(String(Math.floor((diff % 60000) / 1000)).padStart(2,'0'));
    }
    updateNPC(); setInterval(updateNPC, 1000);
  }

  /* ── Jumu'ah Countdown ──────────────────── */
  if ($('#jc-d').length) {
    function updateJC() {
      const now2 = new Date(new Date().toLocaleString('en-US', { timeZone:'Asia/Tokyo' }));
      let d = (5 - now2.getDay() + 7) % 7;
      if (d === 0 && (now2.getHours() > 13 || (now2.getHours() === 13 && now2.getMinutes() > 0))) d = 7;
      const fri = new Date(now2); fri.setDate(now2.getDate() + d); fri.setHours(13,0,0,0);
      const diff = Math.max(0, fri - now2);
      $('#jc-d').text(Math.floor(diff / 86400000));
      $('#jc-h').text(Math.floor((diff % 86400000) / 3600000));
      $('#jc-m').text(Math.floor((diff % 3600000) / 60000));
    }
    updateJC(); setInterval(updateJC, 60000);
  }

  /* ── Qibla ──────────────────────────────── */
  const defaultBearing = 293;
  function applyQibla(deg) {
    $('#qibla-ring').css('transform', `rotate(${360 - deg}deg)`);
    $('#qibla-deg').text(`Qibla: ${Math.round(deg)}° from North`);
  }
  applyQibla(defaultBearing);

  $('#qibla-btn').on('click', function () {
    if (!navigator.geolocation) return;
    const $btn = $(this).html('<i class="bi bi-arrow-repeat me-1"></i>Locating…').prop('disabled', true);
    navigator.geolocation.getCurrentPosition(function (pos) {
      const lat1 = pos.coords.latitude * Math.PI / 180;
      const dLng = (39.8262 - pos.coords.longitude) * Math.PI / 180;
      const mLat = 21.4225 * Math.PI / 180;
      const x = Math.sin(dLng) * Math.cos(mLat);
      const y = Math.cos(lat1) * Math.sin(mLat) - Math.sin(lat1) * Math.cos(mLat) * Math.cos(dLng);
      const b = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
      applyQibla(b);
      $btn.html('<i class="bi bi-check-circle me-1"></i>Done').prop('disabled', false);
    }, function () {
      $btn.html('<i class="bi bi-crosshair me-1"></i>Use My Location').prop('disabled', false);
    });
  });

  /* ── Dhikr Counter ──────────────────────── */
  if ($('#dhikr-btn').length) {
    const dhikrs = [
      { a:'سُبْحَانَ اللّٰه', t:'Subḥān Allāh', m:'"Glory be to God"', n:33 },
      { a:'اَلْحَمْدُ لِلّٰه', t:'Alḥamdu lillāh', m:'"All praise is due to God"', n:33 },
      { a:'اَللّٰهُ أَكْبَر', t:'Allāhu Akbar', m:'"God is the Greatest"', n:34 },
      { a:'لَا إِلٰهَ إِلَّا اللّٰه', t:'Lā ilāha illā Allāh', m:'"There is no deity except God"', n:100 },
      { a:'أَسْتَغْفِرُ اللّٰه', t:'Astaghfiru Allāh', m:'"I seek forgiveness from God"', n:100 },
    ];
    let idx = 0, cnt = 0;
    function renderD() {
      const d = dhikrs[idx];
      $('#dhikr-arabic').text(d.a);
      $('#dhikr-trans').text(d.t);
      $('#dhikr-meaning').text(d.m);
      $('#dhikr-count').text(cnt);
      $('#dhikr-target').text(`${cnt} / ${d.n}`);
    }
    renderD();
    $('#dhikr-btn').on('click', function () {
      cnt = Math.min(cnt + 1, dhikrs[idx].n);
      renderD();
    });
    window.dhikrNext  = function(dir){ idx=(idx+dir+dhikrs.length)%dhikrs.length; cnt=0; renderD(); };
    window.dhikrReset = function(){ cnt=0; renderD(); };
  }

  /* ── Gallery lightbox ───────────────────── */
  $(document).on('click', '[data-lightbox]', function () {
    const src = $(this).data('lightbox') || $(this).find('img').attr('src');
    const alt = $(this).find('img').attr('alt') || '';
    $('#lb-img').attr({ src, alt });
    $('#lb-caption').text(alt);
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('lightboxModal'));
    modal.show();
  });

  /* ── Contact form ───────────────────────── */
  $('#contact-form').on('submit', function (e) {
    e.preventDefault();
    $('#form-success').removeClass('d-none');
    this.reset();
    setTimeout(() => $('#form-success').addClass('d-none'), 6000);
  });

  /* ── Scroll-to-top ──────────────────────── */
  $(window).on('scroll', function () {
    if ($(this).scrollTop() > 380) $('#scroll-top').css('display','flex');
    else $('#scroll-top').hide();
  });
  $('#scroll-top').on('click', function () {
    $('html,body').animate({ scrollTop: 0 }, 300);
  });

  /* ── Smooth scroll (for same-page anchors) ── */
  $('a[href^="#"]').on('click', function (e) {
    const tgt = $(this.getAttribute('href'));
    if (tgt.length) {
      e.preventDefault();
      $('html,body').animate({ scrollTop: tgt.offset().top - 72 }, 380);
      $('#mainNav').collapse('hide');
    }
  });

  /* ── Active nav link ────────────────────── */
  const currentPage = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  $('.nav-link, .dropdown-item').each(function () {
    const href = $(this).attr('href') || '';
    if (href.includes(currentPage)) $(this).addClass('active');
  });

  /* ── Footer year ────────────────────────── */
  $('#footer-year').text(new Date().getFullYear());

  /* ── Today's date ───────────────────────── */
  $('#today-date').text(new Date().toLocaleDateString('en-US',{
    timeZone:'Asia/Tokyo', weekday:'long', year:'numeric', month:'long', day:'numeric'
  }));
});
