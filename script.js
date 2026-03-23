const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const revealItems = document.querySelectorAll('.reveal');
const year = document.getElementById('year');
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
const dropTriggers = document.querySelectorAll('.nav-drop-trigger');
const donationForm = document.getElementById('donationForm');
const donationStatus = document.getElementById('donationStatus');
const amountPills = document.querySelectorAll('.amount-pill');
const donationAmountInput = donationForm?.elements?.donationAmount;
const frequencyPills = document.querySelectorAll('.frequency-pill');
const amountImpact = document.getElementById('amountImpact');
const quickUpiLink = document.getElementById('quickUpiLink');
const upiIdText = document.getElementById('upiIdText');
const copyUpiBtn = document.getElementById('copyUpiBtn');
const upiQrImage = document.getElementById('upiQrImage');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

dropTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const parent = trigger.closest('.nav-dropdown');
    if (!parent) {
      return;
    }
    const isOpen = parent.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });
});

let selectedAmount = 5000;
let selectedPlan = 'one-time';
const upiReceiverId = donationForm?.dataset?.upiId?.trim() || '';
const upiReceiverName = donationForm?.dataset?.upiName?.trim() || 'Pradayini Foundation';
const isLikelyMobile = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');

const buildUpiLink = (amountValue, planValue) => {
  return `upi://pay?pa=${encodeURIComponent(upiReceiverId)}&pn=${encodeURIComponent(upiReceiverName)}&am=${encodeURIComponent(String(amountValue))}&cu=INR&tn=${encodeURIComponent(`Donation-${planValue}`)}`;
};

const updateQuickUpiLink = (amountValue, planValue = selectedPlan) => {
  if (!amountValue || amountValue < 1 || !upiReceiverId) {
    return;
  }
  const upiLink = buildUpiLink(amountValue, planValue);
  if (quickUpiLink) {
    quickUpiLink.href = upiLink;
  }
  if (upiIdText) {
    upiIdText.textContent = upiReceiverId;
  }
  if (upiQrImage) {
    upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(upiLink)}`;
  }
};

const updateAmountImpact = (amountValue) => {
  if (!amountImpact) {
    return;
  }
  if (amountValue >= 10000) {
    amountImpact.textContent = 'Can support multi-location menstrual hygiene outreach and volunteer training.';
  } else if (amountValue >= 5000) {
    amountImpact.textContent = 'Can support one complete village-level menstrual hygiene awareness drive.';
  } else if (amountValue >= 2500) {
    amountImpact.textContent = 'Can support a focused awareness session with educational materials.';
  } else {
    amountImpact.textContent = 'Every contribution supports menstrual hygiene awareness activities.';
  }
};

const setActiveAmountPill = (value) => {
  amountPills.forEach((item) => item.classList.remove('active'));
  const matchingPill = Array.from(amountPills).find(
    (item) => item.dataset.amount === String(value)
  );
  if (matchingPill) {
    matchingPill.classList.add('active');
    return;
  }
  const customPill = Array.from(amountPills).find((item) => item.dataset.amount === 'custom');
  if (customPill) {
    customPill.classList.add('active');
  }
};

amountPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    const amountValue = pill.dataset.amount;
    if (amountValue === 'custom') {
      setActiveAmountPill('custom');
      if (donationAmountInput) {
        donationAmountInput.focus();
      }
      return;
    }
    selectedAmount = Number(amountValue);
    if (donationAmountInput) {
      donationAmountInput.value = String(selectedAmount);
    }
    updateAmountImpact(selectedAmount);
    updateQuickUpiLink(selectedAmount, selectedPlan);
    setActiveAmountPill(amountValue);
  });
});

if (donationAmountInput) {
  const initialAmount = Number(donationAmountInput.value || selectedAmount);
  if (initialAmount > 0) {
    selectedAmount = initialAmount;
  }
  donationAmountInput.value = String(selectedAmount);
  setActiveAmountPill(String(selectedAmount));
  updateAmountImpact(selectedAmount);
  updateQuickUpiLink(selectedAmount, selectedPlan);
  donationAmountInput.addEventListener('input', () => {
    const typedAmount = Number(donationAmountInput.value || 0);
    selectedAmount = typedAmount;
    updateAmountImpact(typedAmount);
    if (typedAmount === 5000 || typedAmount === 10000) {
      setActiveAmountPill(String(typedAmount));
    } else {
      setActiveAmountPill('custom');
    }
    updateQuickUpiLink(typedAmount, selectedPlan);
  });
}

frequencyPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    frequencyPills.forEach((item) => item.classList.remove('active'));
    pill.classList.add('active');
    selectedPlan = pill.dataset.plan || 'one-time';
    if (donationForm?.elements?.donationPlan) {
      donationForm.elements.donationPlan.value = selectedPlan;
    }
    updateQuickUpiLink(selectedAmount, selectedPlan);
  });
});

if (copyUpiBtn) {
  copyUpiBtn.addEventListener('click', async () => {
    if (!upiReceiverId) {
      if (donationStatus) {
        donationStatus.textContent = 'Please set your UPI ID first in data-upi-id.';
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(upiReceiverId);
      if (donationStatus) {
        donationStatus.textContent = 'UPI ID copied. Paste it in any UPI app.';
      }
    } catch (error) {
      if (donationStatus) {
        donationStatus.textContent = `Copy failed. Please copy manually: ${upiReceiverId}`;
      }
    }
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => observer.observe(item));

if (contactForm && formNote) {
  const saveContactSubmission = async (payload) => {
    const sheetEndpoint = contactForm.dataset.sheetEndpoint?.trim() || '';
    const hasEndpoint =
      sheetEndpoint && sheetEndpoint !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';

    if (hasEndpoint) {
      try {
        // no-cors mode keeps this compatible with simple Apps Script deployments
        await fetch(sheetEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        return 'sheet';
      } catch (error) {
        // fall through to local backup
      }
    }

    try {
      const storageKey = 'pradayini_contact_submissions';
      const storedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
      storedItems.push(payload);
      localStorage.setItem(storageKey, JSON.stringify(storedItems));
      return hasEndpoint ? 'local_backup' : 'local_only';
    } catch (error) {
      return 'not_saved';
    }
  };

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const recipient = contactForm.dataset.recipient || '';
    const whatsappNumber = '918707745403';
    const smsNumber = '+918707745403';
    const channel = contactForm.elements.channel?.value || 'email';
    const name = contactForm.elements.name?.value?.trim() || '';
    const email = contactForm.elements.email?.value?.trim() || '';
    const message = contactForm.elements.message?.value?.trim() || '';
    const savedAt = new Date().toISOString();
    const payload = {
      savedAt,
      channel,
      name,
      email,
      message,
      source: 'Pradayini Foundation Website',
    };

    if (!recipient || recipient === 'your-email@example.com') {
      formNote.textContent = 'Set your email in contact form data-recipient to receive messages.';
      return;
    }

    formNote.textContent = 'Saving your entry...';
    const saveStatus = await saveContactSubmission(payload);

    const subject = encodeURIComponent(`Website Contact - ${name || 'New Message'}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    );

    if (channel === 'whatsapp') {
      const text = encodeURIComponent(
        `Hello Pradayini Foundation,\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
      formNote.textContent = 'Saved and WhatsApp opened with your message.';
    } else if (channel === 'sms') {
      const text = encodeURIComponent(
        `Hello Pradayini Foundation, Name: ${name}, Email: ${email}, Message: ${message}`
      );
      window.location.href = `sms:${smsNumber}?body=${text}`;
      formNote.textContent = 'Saved and SMS app opened with your message.';
    } else {
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
      formNote.textContent = 'Saved and email draft opened in your mail app.';
    }

    if (saveStatus === 'local_backup') {
      formNote.textContent += ' (Sheet unreachable, saved in browser backup)';
    } else if (saveStatus === 'local_only') {
      formNote.textContent += ' (Saved in browser backup; add sheet endpoint to sync online)';
    } else if (saveStatus === 'not_saved') {
      formNote.textContent += ' (Warning: save failed)';
    }
    contactForm.reset();
  });
}

if (donationForm && donationStatus) {
  if (donationForm.elements.donationPlan?.value) {
    selectedPlan = donationForm.elements.donationPlan.value;
  }
  updateQuickUpiLink(selectedAmount, selectedPlan);

  donationForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const razorpayKey = donationForm.dataset.razorpayKey || '';
    const merchantName = donationForm.dataset.merchantName || 'Pradayini Foundation';
    const hasRazorpayKey = razorpayKey && razorpayKey !== 'rzp_test_your_key_here';
    const donorName = donationForm.elements.donorName?.value?.trim() || '';
    const donorEmail = donationForm.elements.donorEmail?.value?.trim() || '';
    const donorPhone = donationForm.elements.donorPhone?.value?.trim() || '';
    const paymentType = donationForm.elements.paymentType?.value || 'upi_direct';

    const finalAmount = Number(donationForm.elements.donationAmount?.value || selectedAmount || 0);

    if (!finalAmount || finalAmount < 1) {
      donationStatus.textContent = 'Please select or enter a valid amount.';
      return;
    }

    if (!upiReceiverId && paymentType === 'upi_direct') {
      donationStatus.textContent = 'Set your UPI ID in data-upi-id first.';
      return;
    }

    if (paymentType === 'upi_direct') {
      const upiLink = buildUpiLink(finalAmount, selectedPlan);
      if (isLikelyMobile()) {
        window.location.href = upiLink;
        donationStatus.textContent = 'Opening UPI app. Complete the payment and submit screenshot if needed.';
      } else {
        donationStatus.textContent = 'Use your mobile UPI app to scan the QR code and complete payment.';
      }
      return;
    }

    if (!hasRazorpayKey) {
      if (upiReceiverId) {
        const upiLink = buildUpiLink(finalAmount, selectedPlan);
        if (isLikelyMobile()) {
          window.location.href = upiLink;
          donationStatus.textContent = 'Gateway key not set, opening UPI app directly.';
        } else {
          donationStatus.textContent = 'Gateway key not set. Scan QR or use Quick UPI Link for payment.';
        }
      } else {
        donationStatus.textContent = 'Set Razorpay key or UPI ID to receive payments.';
      }
      return;
    }

    if (typeof window.Razorpay === 'undefined') {
      donationStatus.textContent = 'Payment gateway failed to load. Check internet and try again.';
      return;
    }

    let method;
    if (paymentType === 'netbanking') {
      method = { netbanking: true, card: false, upi: false, wallet: false };
    } else if (paymentType === 'card') {
      method = { netbanking: false, card: true, upi: false, wallet: false };
    } else if (paymentType === 'upi') {
      method = { netbanking: false, card: false, upi: true, wallet: false };
    }

    const options = {
      key: razorpayKey,
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      name: merchantName,
      description: `Donation (${selectedPlan})`,
      image: 'assets/pradayini-logo.png',
      prefill: {
        name: donorName,
        email: donorEmail,
        contact: donorPhone,
      },
      notes: {
        source: 'Website Donation',
        plan: selectedPlan,
      },
      method,
      theme: {
        color: '#c7172f',
      },
      handler: (response) => {
        donationStatus.textContent = `Payment successful. Payment ID: ${response.razorpay_payment_id}`;
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response) => {
      const reason = response?.error?.description || 'Please try again.';
      donationStatus.textContent = `Payment failed: ${reason}`;
    });
    razorpay.open();
  });
}
