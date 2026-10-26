/* MMM-BirthdayCelebration
 *
 * On someone's birthday, a compact "Happy Birthday" card appears in its assigned region.
 * The rest of the time the module draws nothing. People live in config/birthdays.json and are re-read every 10 minutes.
 */
Module.register("MMM-BirthdayCelebration", {
  defaults: {
    timezone: null,
    debugDate: null,
    dataFile: "birthdays.json", // looked up in the MagicMirror config folder
    refreshInterval: 10 * 60 * 1000,
    showFromHour: 0, // 24-hour clock; the card shows from this hour...
    showUntilHour: 24, // ...until this hour (24 = through the end of the day)
    confetti: true, // set false on a slow display
    preview: false, // true = always show a sample card, to check how it looks
    // Use debugDate above for synthetic screenshots.
  },

  getScripts() {
    return [this.file("date-utils.js"), this.file("birthday-logic.js")];
  },

  getStyles() {
    return [this.file("MMM-BirthdayCelebration.css")];
  },

  schedule(fn, ms) {
    this.timers.push(setInterval(fn, ms));
  },
  suspend() {
    (this.timers || []).forEach(clearInterval);
    this.timers = [];
  },
  resume() {
    this.start();
  },

  start() {
    this.suspend();
    this.birthdayData = null;
    this.errorText = null;
    this.lastRaw = null;
    this.renderedState = null;

    this.requestData();
    this.schedule(() => this.requestData(), this.config.refreshInterval);

    // Redraw at midnight and when the show window opens or closes.
    this.schedule(() => {
      if (
        this.renderedState !== null &&
        this.renderedState !== this.stateKey()
      ) {
        this.updateDom(0);
      }
    }, 30 * 1000);
  },

  now() {
    const p = BirthdayDates.parts(this.config.timezone, this.config.debugDate);
    return {
      getFullYear: () => p.year,
      getMonth: () => p.month - 1,
      getDate: () => p.day,
      getHours: () => p.hour,
    };
  },

  inWindow(now) {
    if (this.config.debugDate || this.config.preview) {
      return true;
    }
    const h = now.getHours();
    return h >= this.config.showFromHour && h < this.config.showUntilHour;
  },

  // Changes at midnight and when the show window opens or closes.
  stateKey() {
    const now = this.now();
    return (
      now.getFullYear() +
      "-" +
      (now.getMonth() + 1) +
      "-" +
      now.getDate() +
      (this.inWindow(now) ? "|on" : "|off")
    );
  },

  requestData() {
    if (this.config.preview) {
      this.updateDom(0);
      return;
    }
    this.sendSocketNotification("BIRTHDAY_LOAD", {
      instanceId: this.identifier,
      dataFile: this.config.dataFile,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (!payload || payload.instanceId !== this.identifier) return;
    payload = notification.endsWith("_ERROR") ? payload.error : payload.data;
    if (notification === "BIRTHDAY_DATA") {
      const raw = JSON.stringify(payload);
      if (raw === this.lastRaw && !this.errorText) {
        return; // nothing changed, skip the redraw
      }
      this.lastRaw = raw;
      this.birthdayData = payload;
      this.errorText = null;
      this.updateDom(0);
    } else if (notification === "BIRTHDAY_ERROR") {
      this.errorText = payload;
      this.updateDom(0);
    }
  },

  el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) {
      node.className = cls;
    }
    if (text !== undefined && text !== null) {
      node.textContent = text;
    }
    return node;
  },

  cakeSvg() {
    const wrap = this.el("div", "bd-cake");
    wrap.innerHTML =
      '<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="14" y="78" width="92" height="26" rx="6" fill="#9C4DFF"/>' +
      '<rect x="24" y="52" width="72" height="28" rx="6" fill="#FFB74D"/>' +
      '<path d="M24 60 q9 12 18 0 q9 12 18 0 q9 12 18 0 q9 12 18 0 v-8 h-72z" fill="#FFF3E0"/>' +
      '<rect x="40" y="30" width="6" height="24" rx="2" fill="#4FC3F7"/>' +
      '<rect x="57" y="26" width="6" height="28" rx="2" fill="#F06292"/>' +
      '<rect x="74" y="30" width="6" height="24" rx="2" fill="#81C784"/>' +
      '<ellipse cx="43" cy="22" rx="4" ry="7" fill="#FFD54F"/>' +
      '<ellipse cx="60" cy="18" rx="4" ry="7" fill="#FFD54F"/>' +
      '<ellipse cx="77" cy="22" rx="4" ry="7" fill="#FFD54F"/>' +
      "</svg>";
    return wrap;
  },

  confettiLayer() {
    const layer = this.el("div", "bd-confetti");
    const colors = [
      "#FFB74D",
      "#9C4DFF",
      "#4FC3F7",
      "#F06292",
      "#81C784",
      "#FFD54F",
    ];
    for (let i = 0; i < 26; i++) {
      const piece = this.el("span", "bd-piece");
      piece.style.left = Math.round(Math.random() * 100) + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      piece.style.animationDuration = (5 + Math.random() * 4).toFixed(2) + "s";
      layer.appendChild(piece);
    }
    return layer;
  },

  getDom() {
    const wrapper = this.el("div", "birthday");
    let now;
    try {
      now = this.now();
    } catch (error) {
      wrapper.appendChild(this.el("div", "bd-msg", error.message));
      return wrapper;
    }
    this.renderedState = this.stateKey();

    if (this.errorText) {
      wrapper.appendChild(
        this.el("div", "bd-msg", "Birthdays: " + this.errorText),
      );
      return wrapper;
    }

    let people;
    if (this.config.preview) {
      people = [{ name: "Your Name", age: 7, note: null }];
    } else {
      if (!this.birthdayData || !this.inWindow(now)) {
        return wrapper; // nothing to show yet
      }
      try {
        people = BirthdayLogic.onDay(
          BirthdayLogic.normalize(this.birthdayData),
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate(),
        );
      } catch (e) {
        wrapper.appendChild(
          this.el("div", "bd-msg", "Birthdays data problem: " + e.message),
        );
        return wrapper;
      }
    }
    if (!people.length) {
      return wrapper;
    }

    const card = this.el(
      "div",
      "bd-card" + (people.length > 2 ? " bd-many" : ""),
    );
    if (this.config.confetti) {
      card.appendChild(this.confettiLayer());
    }
    card.appendChild(this.cakeSvg());
    card.appendChild(this.el("div", "bd-title", "Happy Birthday"));
    people.forEach((p) => {
      const person = this.el("div", "bd-person");
      person.appendChild(
        this.el(
          "div",
          "bd-name" + (p.name.length > 12 ? " bd-long" : ""),
          p.name + "!",
        ),
      );
      if (p.age) {
        person.appendChild(
          this.el("div", "bd-age", "Turning " + p.age + " today"),
        );
      }
      if (p.note) {
        person.appendChild(this.el("div", "bd-note", p.note));
      }
      card.appendChild(person);
    });
    wrapper.appendChild(card);
    return wrapper;
  },
});
