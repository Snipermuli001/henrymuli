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

$("#year").textContent = new Date().getFullYear();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Mobile navigation
const toggle = $(".menu-toggle");
const mobileMenu = $("#mobile-menu");
toggle?.addEventListener("click", () => {
  const open = mobileMenu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
$$(".mobile-menu a").forEach(a => a.addEventListener("click", () => {
  mobileMenu.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
}));

// Smooth navigation with active section
const sections = $$("section[data-section]");
const navLinks = $$(".nav-links a, .mobile-menu a");
const linkById = id => navLinks.filter(a => a.getAttribute("href") === `#${id}`);
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove("active"));
      linkById(entry.target.id).forEach(a => a.classList.add("active"));
    }
  });
}, {rootMargin:"-35% 0px -55% 0px", threshold:0});
sections.forEach(s => observer.observe(s));

// Reveal animations
if (!reduced) {
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

// Scroll progress
const progress = $(".scroll-progress span");
const updateProgress = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
};
addEventListener("scroll", updateProgress, {passive:true});
updateProgress();

// Lightweight particles
if (!reduced) {
  const wrap = $("#particles");
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

// Desktop cursor
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

// Lightweight interactive card tilt on pointer devices
if (!reduced && matchMedia("(pointer:fine)").matches) {
  $$(".project-card,.service-card,.why-card,.stat-card").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-5px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

// Make career-history company tiles reliably clickable on every device/browser.
$(".workplace-link").forEach(link => {
  link.addEventListener("click", e => {
    e.stopPropagation();
  }, true);
});

// Button press feedback
$$(".btn").forEach(btn => {
  btn.addEventListener("pointerdown", () => btn.classList.add("pressed"));
  btn.addEventListener("pointerup", () => btn.classList.remove("pressed"));
  btn.addEventListener("pointerleave", () => btn.classList.remove("pressed"));
});

// Subtle hero parallax
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
  if (bubble) {
    bubble.innerHTML = (e.target.value.trim() || "Your message will appear here…") + "<small>now ✓✓</small>";
  }
});

// WhatsApp contact: opens Henry's WhatsApp chat with the visitor's message pre-filled.
$("#contact-form")?.addEventListener("submit", e => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $("#form-status");
  const button = form.querySelector("button[type=\"submit\"]");
  const message = form.message.value.trim();

  if (!message) {
    status.textContent = "Type your message first.";
    form.message.focus();
    return;
  }

  button.disabled = true;
  status.textContent = "Opening WhatsApp…";

  const text = `Hello Henry, I visited your website.\\n\\n${message}`;
  const url = `https://wa.me/254792765039?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");

  window.setTimeout(() => {
    button.disabled = false;
    status.textContent = "WhatsApp opened — send the message there.";
    form.message.value = "";
    const bubble = $("#preview-bubble");
    if (bubble) bubble.innerHTML = "Your message will appear here…<small>now ✓✓</small>";
  }, 450);
});

// Profile image rotation: alternate between the current portfolio photo and the navy-blue security-uniform photo.
const profileFrame = $(".profile-frame");
const profileImg = $(".profile-image");
if (profileFrame && profileImg) {
  const newImage = profileImg.dataset.newImage;
  const oldImage = profileImg.dataset.oldImage || "sphoto.png";
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

// Working CV download: preserve the real PDF file and give it a stable download name.
const cvLink = $("[data-cv]");
cvLink?.addEventListener("click", () => {
  cvLink.setAttribute("download", "Henry_Muli_Muthini_2026_CV.pdf");
});

// Mobile-money support cards: tap/click a brand to flip it and reveal the support number.
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

// Placeholder social links: never invent destinations.
$$("[data-social]").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  const status = $("#form-status");
  if (status) status.textContent = `${a.dataset.social} link is ready to be added in js/script.js.`;
  document.querySelector("#contact")?.scrollIntoView({behavior: reduced ? "auto" : "smooth"});
}));


/* Interactive portfolio iPhone: Home, Calculator, Clock, Projects, WhatsApp and Phone. */
const iphone = $("#portfolio-iphone");
if (iphone) {
  const views = $$('[data-iphone-view]', iphone);
  const openView = name => views.forEach(view => view.classList.toggle("active", view.dataset.iphoneView === name));
  $$('[data-open-app]', iphone).forEach(button => button.addEventListener("click", () => openView(button.dataset.openApp)));
  $$('[data-home]', iphone).forEach(button => button.addEventListener("click", () => openView("home")));

  const pad = n => String(n).padStart(2, "0");
  const updateIphoneTime = () => {
    const now = new Date();
    const time = \`\${pad(now.getHours())}:\${pad(now.getMinutes())}\`;
    const seconds = \`\${time}:\${pad(now.getSeconds())}\`;
    $("#iphone-live-time", iphone).textContent = time;
    $("#iphone-clock", iphone).textContent = time;
    $("#clock-big-time", iphone).textContent = seconds;
    $("#iphone-date", iphone).textContent = now.toLocaleDateString("en-GB", {weekday:"long", month:"long", day:"numeric"}).toUpperCase();
  };
  updateIphoneTime();
  window.setInterval(updateIphoneTime, 1000);

  // Safe calculator — no eval().
  const calcDisplay = $("#calc-display", iphone);
  let calcValue = "0", calcStored = null, calcOperator = null, calcFresh = true;
  const renderCalc = () => { calcDisplay.textContent = calcValue; };
  const calculate = (a,b,op) => {
    if (op === "+") return a+b;
    if (op === "-") return a-b;
    if (op === "*") return a*b;
    if (op === "/") return b === 0 ? null : a/b;
    return b;
  };
  $$('[data-calc]', iphone).forEach(key => key.addEventListener("click", () => {
    const value = key.dataset.calc;
    if (/^\d$/.test(value)) {
      if (calcFresh || calcValue === "0") calcValue = value;
      else if (calcValue.length < 12) calcValue += value;
      calcFresh = false; renderCalc(); return;
    }
    if (value === ".") {
      if (calcFresh) { calcValue = "0."; calcFresh = false; }
      else if (!calcValue.includes(".")) calcValue += ".";
      renderCalc(); return;
    }
    if (value === "clear") { calcValue="0"; calcStored=null; calcOperator=null; calcFresh=true; renderCalc(); return; }
    if (value === "sign") { if (calcValue !== "0") calcValue = calcValue.startsWith("-") ? calcValue.slice(1) : "-"+calcValue; renderCalc(); return; }
    if (value === "percent") { calcValue=String(Number(calcValue)/100); renderCalc(); return; }
    if (["+","-","*","/"].includes(value)) {
      const n=Number(calcValue);
      if (calcStored !== null && calcOperator && !calcFresh) {
        const result=calculate(calcStored,n,calcOperator);
        if (result===null) { calcValue="Error"; calcStored=null; calcOperator=null; calcFresh=true; renderCalc(); return; }
        calcStored=result; calcValue=String(result);
      } else calcStored=n;
      calcOperator=value; calcFresh=true; renderCalc(); return;
    }
    if (value === "=" && calcStored !== null && calcOperator) {
      const result=calculate(calcStored,Number(calcValue),calcOperator);
      calcValue=result===null ? "Error" : String(result);
      calcStored=null; calcOperator=null; calcFresh=true; renderCalc();
    }
  }));

  const projectDetails = {
    security:"A modern security-company website concept with responsive design, services, contact functionality and room for administrative expansion.",
    python:"A growing hands-on journey through Python, programming fundamentals and practical AI-development experiments.",
    business:"Technology-focused business ideas designed around practical problems, digital presence and useful products.",
    portfolio:"This portfolio: a living digital identity combining security operations, technology, web development and an evolving AI journey."
  };
  $$('[data-project]', iphone).forEach(button => button.addEventListener("click", () => {
    $("#iphone-project-detail", iphone).textContent = projectDetails[button.dataset.project] || "Project information coming soon.";
  }));
}
