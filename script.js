document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const answer = btn.nextElementSibling;
    answer.style.maxHeight = answer.style.maxHeight
      ? null
      : answer.scrollHeight + "px";
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.2 },
);

document.querySelectorAll(".fade").forEach((el) => {
  observer.observe(el);
});
