import { Linking } from 'react-native';
import { showAlert } from './alert';

// Help & support contact details, kept in one place (Improvement Tracker W-08).
// For now the app shows info@ and one phone number; the team discussed a separate
// support mailbox, so change SUPPORT_EMAIL here when that is decided.
export const SUPPORT_EMAIL = 'info@0waste.co.in';
export const SUPPORT_PHONE = '+91 99071 91928'; // shown to users
const SUPPORT_PHONE_DIAL = '+919907191928'; // used in the tel: link
const SUPPORT_ADDRESS = 'Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051';

// Opens the user's email app with our address and a subject filled in. If no email
// app can open it (common on computers), the address is shown so they can copy it.
export function emailSupport() {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('KarmaVer$e support request')}`;
  Linking.openURL(url).catch(() =>
    showAlert('No email app found', `Please write to us at ${SUPPORT_EMAIL}.`)
  );
}

// Opens the phone dialer with our number. On a computer without a phone app the
// link may do nothing, so the number is also written in the Help & support pop-up.
export function callSupport() {
  Linking.openURL(`tel:${SUPPORT_PHONE_DIAL}`).catch(() =>
    showAlert('Can\'t open the phone app', `Please call us on ${SUPPORT_PHONE}.`)
  );
}

// Profile -> Help & support: contact details plus Email us / Call us buttons.
export function showHelpAndSupport() {
  showAlert(
    'Help & support',
    `Reach out to us anytime:\n\nEmail: ${SUPPORT_EMAIL}\nPhone: ${SUPPORT_PHONE}\nAddress: ${SUPPORT_ADDRESS}`,
    [
      { text: 'Email us', onPress: emailSupport },
      { text: 'Call us', onPress: callSupport },
      { text: 'Close', style: 'cancel' },
    ]
  );
}
