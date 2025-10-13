/**
 * Returns the csrf token from an html document if it exists
 *
 */
const extractCSRFToken = (html, fieldName = '_csrf') => {
  const regex = new RegExp(`<input[^>]*name="${fieldName}"[^>]*>`, 'i');
  const inputMatch = html.match(regex);
  if (!inputMatch) return null;

  const valueMatch = inputMatch[0].match(/value="([^"]+)"/);
  return valueMatch ? valueMatch[1] : null;
};

/** Search for commonly used csrf token names
 * _csrf
 * csrf_token
 * authenticity_token (Rails)
 * csrfmiddlewaretoken (Django)
 * _token (Laravel)
 * __RequestVerificationToken (.NET)
 * Custom names like antiCSRF, xsrf_token, etc.
 */
const checkForCommonlyUsedCSRFTokenNames = (html) => {
  const common_csrf_names = [
    '_csrf',
    'csrf_token',
    'authenticity_token',
    'csrfmiddlewaretoken',
    '_token',
    '_RequestVerificationToken',
    'antiCSRF',
    'xsrf_token',
  ];
  let csrf_token;
  let i = 0;
  for (i = 0; i < common_csrf_names.length; i++) {
    csrf_token = extractCSRFToken(html, common_csrf_names[i]);
    if (csrf_token) break;
  }
  return (
    csrf_token && {
      token: csrf_token,
      name: common_csrf_names[i],
    }
  );
};

const extractCSRFTokenHelper = (html, fieldName = '_csrf') => {
  let csrf_token = extractCSRFToken(html, fieldName);
  if (csrf_token) return csrf_token;
  const other_possibilities = checkForCommonlyUsedCSRFTokenNames(html);
  if (other_possibilities) {
    console.error(`Could not find CSRF token with name "${fieldName}".
Found "${other_possibilities.name}" with value "${other_possibilities.token}".
Consider updating your code to use fieldName="${other_possibilities.name}"`);
  }
};

export { extractCSRFTokenHelper };
