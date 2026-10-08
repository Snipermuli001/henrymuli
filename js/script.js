const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const remoteImage = "https://cdn.phototourl.com/member/2026-10-06-e85ecf0a-3da0-4682-8e65-dacca4bd9e3d.png";
const profile = $(".profile-image");
if (profile) {
  profile.addEventListener("error", () => {
    if (profile.src !== remoteImage) profile.src = remoteImage;
    else profile.closest(".profile-frame")?.classList.add("image-missing");
  });
}

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const toggle = $(".menu-toggle");
const mobileMenu = $("#mobile-menu");
toggle?.addEventListener("click", () => {
  const open = mobileMenu?.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(!!open));
});
$$(".mobile-menu a").forEach(a => a.addEventListener("click", () => {
  mobileMenu?.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
}));

const sections = $$("section[data-section]");
const navLinks = $$(".nav-links a, .mobile-menu a");
const linkById = id => navLinks.filter(a => a.getAttribute("href") === `#${id}`);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove("active"));
        linkById(entry.target.id).forEach(a => a.classList.add("active"));
      }
    });
  }, {rootMargin:"-35% 0px -55% 0px", threshold:0});
  sections.forEach(s => observer.observe(s));
}

if (!reduced && "IntersectionObserver" in window) {
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        reveal.unobserve(entry.target);
      }
    });
  }, {threshold:.12});
  $$(".reveal").forEach(el => reveal.observe(el));
} else $$(".reveal").forEach(el => el.classList.add("visible"));

const progress = $(".scroll-progress span");
const updateProgress = () => {
  if (!progress) return;
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
};
addEventListener("scroll", updateProgress, {passive:true});
updateProgress();

if (!reduced) {
  const wrap = $("#particles");
  if (wrap) {
    for (let i=0;i<42;i++) {
      const p=document.createElement("span");
      p.className="particle";
      p.style.left = Math.random()*100+"%";
      p.style.top = (60+Math.random()*50)+"%";
      p.style.animationDuration = (12+Math.random()*20)+"s";
      p.style.animationDelay = (-Math.random()*20)+"s";
      wrap.appendChild(p);
    }
  }
}

const dot = $(".cursor-dot"), ring = $(".cursor-ring");
if (dot && ring && matchMedia("(pointer:fine)").matches && !reduced) {
  let rx=0, ry=0, tx=0, ty=0;
  addEventListener("pointermove", e => {
    tx=e.clientX; ty=e.clientY;
    dot.style.transform=`translate(${tx-2.5}px,${ty-2.5}px)`;
  });
  const follow=()=>{rx+=(tx-rx)*.14;ry+=(ty-ry)*.14;ring.style.left=rx+"px";ring.style.top=ry+"px";requestAnimationFrame(follow)};
  follow();
  $$("a,button,.skill-cloud span,.project-card,.service-card").forEach(el=>{
    el.addEventListener("mouseenter",()=>ring.classList.add("hover"));
    el.addEventListener("mouseleave",()=>ring.classList.remove("hover"));
  });
}

if (!reduced && matchMedia("(pointer:fine)").matches) {
  $$(".project-card,.service-card,.why-card,.stat-card").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-5px)`;
    });
    card.addEventListener("pointerleave", () => card.style.transform = "");
  });
}

$$(".workplace-link").forEach(link => link.addEventListener("click", e => e.stopPropagation(), true));
$$(".btn").forEach(btn => {
  btn.addEventListener("pointerdown", () => btn.classList.add("pressed"));
  btn.addEventListener("pointerup", () => btn.classList.remove("pressed"));
  btn.addEventListener("pointerleave", () => btn.classList.remove("pressed"));
});

const heroVisual = $("[data-parallax]");
if (heroVisual && !reduced && matchMedia("(pointer:fine)").matches) {
  addEventListener("pointermove", e => {
    const x=(e.clientX/innerWidth-.5)*10, y=(e.clientY/innerHeight-.5)*8;
    heroVisual.style.transform=`perspective(900px) rotateY(${x}deg) rotateX(${-y}deg)`;
  });
  addEventListener("pointerleave",()=>heroVisual.style.transform="");
}

$("#message")?.addEventListener("input", e => {
  const bubble = $("#preview-bubble");
  if (bubble) bubble.innerHTML = (e.target.value.trim() || "Your message will appear here…") + "<small>now ✓✓</small>";
});

$("#contact-form")?.addEventListener("submit", e => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $("#form-status");
  const button = form.querySelector('button[type="submit"]');
  const message = form.message?.value.trim();
  if (!message) {
    if (status) status.textContent = "Type your message first.";
    form.message?.focus();
    return;
  }
  if (button) button.disabled = true;
  if (status) status.textContent = "Opening WhatsApp…";
  const text = `Hello Henry, I visited your website.\n\n${message}`;
  const url = `https://wa.me/254792765039?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    if (button) button.disabled = false;
    if (status) status.textContent = "WhatsApp opened — send the message there.";
    if (form.message) form.message.value = "";
    const bubble = $("#preview-bubble");
    if (bubble) bubble.innerHTML = "Your message will appear here…<small>now ✓✓</small>";
  }, 450);
});

const profileFrame = $(".profile-frame");
const profileImg = $(".profile-image");
if (profileFrame && profileImg) {
  const newImage = profileImg.dataset.newImage;
  const oldImage = profileImg.dataset.oldImage || "sphoto.png";
  if (newImage) {
    let showingNew = false;
    const showImage = (url, isNew) => {
      profileImg.style.opacity = "0";
      window.setTimeout(() => {
        profileImg.src = url;
        profileImg.style.opacity = "1";
        profileFrame.classList.toggle("profile-swapped", !isNew);
      }, 220);
    };
    profileImg.style.transition = "opacity .22s ease";
    window.setInterval(() => {
      showingNew = !showingNew;
      showImage(showingNew ? newImage : oldImage, showingNew);
    }, 5000);
  }
}

const cvLink = $("[data-cv]");
cvLink?.addEventListener("click", () => cvLink.setAttribute("download", "Henry_Muli_Muthini_2026_CV.pdf"));

function togglePaymentCard(card) {
  const wasFlipped = card.classList.contains("flipped");
  document.querySelectorAll("[data-pay-card]").forEach(other => {
    other.classList.remove("flipped");
    other.setAttribute("aria-pressed", "false");
  });
  if (!wasFlipped) {
    card.classList.add("flipped");
    card.setAttribute("aria-pressed", "true");
    window.clearTimeout(card._resetTimer);
    card._resetTimer = window.setTimeout(() => {
      card.classList.remove("flipped");
      card.setAttribute("aria-pressed", "false");
    }, 8000);
  }
}
document.querySelectorAll("[data-pay-card]").forEach(card => {
  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePaymentCard(card);
    }
  });
});

$$("[data-social]").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  const status = $("#form-status");
  if (status) status.textContent = `${a.dataset.social} link is ready to be added in js/script.js.`;
  document.querySelector("#contact")?.scrollIntoView({behavior: reduced ? "auto" : "smooth"});
}));