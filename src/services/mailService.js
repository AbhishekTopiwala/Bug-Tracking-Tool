import emailjs from '@emailjs/browser';

/**
 * Sends an invitation email to a new team member using EmailJS (Free Tier).
 * 
 * @param {string} toEmail - The recipient's email address.
 * @param {string} name - The recipient's name.
 * @param {string} role - The assigned role.
 * @param {string} invitedBy - The name/email of the person who sent the invite.
 * @param {string} invitedByEmail - The email of the person who sent the invite.
 */
export async function sendInviteEmail(toEmail, name, role, invitedBy, invitedByEmail) {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      const errorMsg = 'EmailJS credentials are missing in your .env file. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.';
      console.warn(`[mailService] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const templateParams = {
      to_email: toEmail,
      to_name: name,
      role: role,
      invited_by: invitedBy,
      invited_by_email: invitedByEmail,
      app_url: `${window.location.origin}/invite?email=${encodeURIComponent(toEmail)}`,
    };

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      publicKey
    );

    console.log('[mailService] Invitation email sent via EmailJS:', response.status, response.text);
  } catch (error) {
    console.error('[mailService] EmailJS Error:', error);
    throw new Error(error.message || 'Failed to send invitation email via EmailJS.');
  }
}
