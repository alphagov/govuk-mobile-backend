/**
 * HTML Input Field
 * @interface InputField
 * @property {string}    name        - Comes from the name attribute of the html input tag
 * @property {string}    type        - Comes from the type attribute of the html input tag
 * @property {string}    value       - Comes from the value attribute of the html input tag
 * @property {string}    id          - Comes from the id attribute of the html input tag
 * @property {boolean}   required    - Comes from the required attribute of the html input tag
 * @property {string}    placeholder - Comes from the placeholder property of the html input tag
 * @property {string}    className   - Comes from the className property of the html input tag
 */
interface InputField {
  name: string;
  type: string;
  value: string;
  id: string;
  required: boolean;
  placeholder: string;
  className: string;
}

/**
 * HTML Checkbox or Radio field
 * @interface CheckboxField
 * @extends InputField
 * @property {union}   type    - Type of field; either checkbox or radio
 * @property {boolean} checked - Comes from the checked attribute of the html input tag when the type = 'check'
 */
interface CheckboxField extends Omit<InputField, "placeholder"> {
  type: "checkbox" | "radio";
  checked: boolean;
}

/**
 * HTML Select Option
 * @interface SelectOption
 * @property {string}  value    - Comes from the value attribute of the html option tag
 * @property {string}  text     - Comes from the inner text of the html option tag
 * @selected {boolean} selected - Comes from the selected attribute of the html option tag
 */
interface SelectOption {
  value: string;
  text: string;
  selected: boolean;
}

/**
 * HTML Select Field
 * @interface SelectField
 * @extends InputField
 * @property {union} type - Constant set to 'select'
 * @property {SelectOption} - Comes from the nested HTML Options tags within the Select Tag
 */
interface SelectField extends Omit<InputField, "placeholder"> {
  type: "select";
  options: SelectOption[];
}

/**
 * HTML Textarea Field
 * @interface TextareaField
 * @extends InputField
 * @property {union} type - Constant set to 'textarea'
 */
interface TextareaField extends InputField {
  type: "textarea";
}

/**
 * FormField union Type - InputField | SelectField | TextareaField | CheckboxField
 * @typedef {type} FormField
 */
type FormField = InputField | SelectField | TextareaField | CheckboxField;

/**
 * FormData - Structure for returning information about the parsed HTML Form
 * @interface FormData
 * @property {string}        action      - Comes from the action property of the HTML Form Tag
 * @property {string}        method      - Comes form the method property of the HTML Form Tag
 * @property {string | null} csrf        - Comes from any nested hidden HTML input field containing a CSRF token
 * @property {FormField[]}   inputs      - Array of form fields parse from the HTML Form
 */
interface FormData {
  action: string;
  method: string;
  csrf: string | null;
  inputs: FormField[];
}

/**
 * @function       parseFormTag
 * @description    parses the first form tag from  an html document using regex
 * @param          {string}   html       - The html document as a string
 * @returns        {FormData} formData   - Object containing csrf token, form action, method, and input fields
 */
function parseFormTag(html: string): string {
  // Find the first form tag and extract its attributes
  const formMatch = html.match(/<form[^>]*>/i);
  if (!formMatch) {
    throw new Error("No form found in the HTML document");
  }
  return formMatch[0];
}

/**
 * @function       parseFormAttributes
 * @description    parses form attributes from an html form tag using regex
 * @param          {string}   formTag    - The complete form tag as an html string
 * @returns        {FormData} formData   - Object containing csrf token, form action, method, and input fields
 */
function parseFormAttributes(formTag: string): FormData {
  // Extract form attributes
  const actionMatch = formTag.match(/action\s*=\s*["']([^"']*)["']/i);
  const methodMatch = formTag.match(/method\s*=\s*["']([^"']*)["']/i);

  const formData: FormData = {
    action: actionMatch ? actionMatch[1] : "",
    method: methodMatch ? methodMatch[1].toLowerCase() : "get",
    csrf: null,
    inputs: [],
  };
  return formData;
}

/**
 * Find the form content (everything between <form> and </form>)
 * @param {string} html - The HTML Form Tag
 * @returns {string}    - The inner tags as a string
 */
const parseFormContent = (html: string): string =>
  html.match(/<form[^>]*>([\s\S]*?)<\/form>/i)[1];

/**
 * Parses the input tags in the form content into an array of strings
 * @param {string} formContent - The inner tags of the form tag as an HTML string
 * @returns {string[]}         - Returns an array of HTML input tags as HTML strings
 */
const parseInputs = (formContent: string): string[] =>
  formContent.match(/<input[^>]*>/gi) || [];

/**
 * Parses the textarea tags in the form content into an array of strings
 * @param {string} formContent - The inner tags of the form tag as an HTML string
 * @returns {string[]}         - Returns an array of HTML textarea tags as HTML strings
 */
const parseTextAreas = (formContent: string): string[] =>
  formContent.match(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi) || [];

/**
 * Parses the select tags in the form content into an array of strings
 * @param {string} formContent - The inner tags of the form tag as an HTML string
 * @returns {string[]}         - Returns an array of HTML select tags as HTML strings
 */
const parseSelects = (formContent: string): string[] =>
  formContent.match(/<select[^>]*>[\s\S]*?<\/select>/gi) || [];

/**
 * @function       processInputs
 * @description    parses input tags from an array of HTML strings using regex
 * @param          {string[]}   inputMatches    - The array of input tags as an array of HTML strings
 * @param          {FormData} formData [IN/OUT] - Object containing csrf token, form action, method, and input fields
 * @mutates        formData
 * @returns        void
 */
const processInputs = (
  inputMatches: Array<string>,
  formData: FormData,
): void => {
  inputMatches.forEach((inputTag) => {
    // Check if this is a checkbox or radio button first
    const typeMatch = inputTag.match(/type\s*=\s*["']([^"']*)["']/i);
    const inputType = typeMatch ? typeMatch[1].toLowerCase() : "text";

    if (inputType === "checkbox" || inputType === "radio") {
      const checkboxData: CheckboxField = {
        name: "",
        type: inputType,
        value: "",
        id: "",
        required: false,
        className: "",
        checked: false,
      };

      // Extract checkbox/radio attributes
      const nameMatch = inputTag.match(/name\s*=\s*["']([^"']*)["']/i);
      const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i);
      const idMatch = inputTag.match(/id\s*=\s*["']([^"']*)["']/i);
      const classMatch = inputTag.match(/class\s*=\s*["']([^"']*)["']/i);
      const requiredMatch = inputTag.match(/required(?:\s|>|$)/i);
      const checkedMatch = inputTag.match(/checked(?:\s|>|$)/i);

      if (nameMatch) checkboxData.name = nameMatch[1];
      if (valueMatch) checkboxData.value = valueMatch[1];
      if (idMatch) checkboxData.id = idMatch[1];
      if (classMatch) checkboxData.className = classMatch[1];
      if (requiredMatch) checkboxData.required = true;
      if (checkedMatch) checkboxData.checked = true;

      formData.inputs.push(checkboxData);
    } else {
      // Handle regular input fields
      const inputData: InputField = {
        name: "",
        type: "text",
        value: "",
        id: "",
        required: false,
        placeholder: "",
        className: "",
      };

      // Extract input attributes
      const nameMatch = inputTag.match(/name\s*=\s*["']([^"']*)["']/i);
      const valueMatch = inputTag.match(/value\s*=\s*["']([^"']*)["']/i);
      const idMatch = inputTag.match(/id\s*=\s*["']([^"']*)["']/i);
      const placeholderMatch = inputTag.match(
        /placeholder\s*=\s*["']([^"']*)["']/i,
      );
      const classMatch = inputTag.match(/class\s*=\s*["']([^"']*)["']/i);
      const requiredMatch = inputTag.match(/required(?:\s|>|$)/i);

      if (nameMatch) inputData.name = nameMatch[1];
      inputData.type = inputType;
      if (valueMatch) inputData.value = valueMatch[1];
      if (idMatch) inputData.id = idMatch[1];
      if (placeholderMatch) inputData.placeholder = placeholderMatch[1];
      if (classMatch) inputData.className = classMatch[1];
      if (requiredMatch) inputData.required = true;

      // Check if this is a CSRF token field
      if (
        inputData.name === "_csrf" ||
        inputData.name === "csrf_token" ||
        inputData.name === "authenticity_token" ||
        inputData.name.toLowerCase().includes("csrf")
      ) {
        formData.csrf = inputData.value;
      }

      formData.inputs.push(inputData);
    }
  });
};

/**
 * @function       processTextAreas
 * @description    parses textarea tags from an array of HTML strings using regex
 * @param          {string[]}   textareaMatches - The textareas as an array of html strings
 * @param          {FormData} formData [IN/OUT] - Object containing csrf token, form action, method, and input fields
 * @mutates        formData
 * @returns        void
 */
const processTextAreas = (
  textareaMatches: Array<string>,
  formData: FormData,
): void => {
  textareaMatches.forEach((textareaTag) => {
    const inputData: TextareaField = {
      name: "",
      type: "textarea",
      value: "",
      id: "",
      required: false,
      placeholder: "",
      className: "",
    };

    // Extract textarea attributes
    const nameMatch = textareaTag.match(/name\s*=\s*["']([^"']*)["']/i);
    const idMatch = textareaTag.match(/id\s*=\s*["']([^"']*)["']/i);
    const placeholderMatch = textareaTag.match(
      /placeholder\s*=\s*["']([^"']*)["']/i,
    );
    const classMatch = textareaTag.match(/class\s*=\s*["']([^"']*)["']/i);
    const requiredMatch = textareaTag.match(/required(?:\s|>|$)/i);

    // Extract textarea content
    const contentMatch = textareaTag.match(
      /<textarea[^>]*>([\s\S]*?)<\/textarea>/i,
    );

    if (nameMatch) inputData.name = nameMatch[1];
    if (idMatch) inputData.id = idMatch[1];
    if (placeholderMatch) inputData.placeholder = placeholderMatch[1];
    if (classMatch) inputData.className = classMatch[1];
    if (requiredMatch) inputData.required = true;
    if (contentMatch) inputData.value = contentMatch[1].trim();

    formData.inputs.push(inputData);
  });
};

/**
 * @function       processSelects
 * @description    parses select tags from an array of HTML strings using regex
 * @param          {string[]} selectMatches     - The HTML Form contents as a string
 * @param          {FormData} formData [IN/OUT] - Object containing csrf token, form action, method, and input fields
 * @mutates        formData
 * @returns        void
 */
const processSelects = (
  selectMatches: Array<string>,
  formData: FormData,
): void => {
  selectMatches.forEach((selectTag) => {
    const inputData: SelectField = {
      name: "",
      type: "select",
      value: "",
      id: "",
      required: false,
      className: "",
      options: [],
    };

    // Extract select attributes
    const nameMatch = selectTag.match(/name\s*=\s*["']([^"']*)["']/i);
    const idMatch = selectTag.match(/id\s*=\s*["']([^"']*)["']/i);
    const classMatch = selectTag.match(/class\s*=\s*["']([^"']*)["']/i);
    const requiredMatch = selectTag.match(/required(?:\s|>|$)/i);

    if (nameMatch) inputData.name = nameMatch[1];
    if (idMatch) inputData.id = idMatch[1];
    if (classMatch) inputData.className = classMatch[1];
    if (requiredMatch) inputData.required = true;

    // Extract options
    const optionMatches =
      selectTag.match(/<option[^>]*>[\s\S]*?<\/option>/gi) || [];

    optionMatches.forEach((optionTag) => {
      const valueMatch = optionTag.match(/value\s*=\s*["']([^"']*)["']/i);
      const selectedMatch = optionTag.match(/selected(?:\s|>|$)/i);
      const textMatch = optionTag.match(/<option[^>]*>([\s\S]*?)<\/option>/i);

      const option: SelectOption = {
        value: valueMatch
          ? valueMatch[1]
          : textMatch
            ? textMatch[1].trim()
            : "",
        text: textMatch ? textMatch[1].trim() : "",
        selected: !!selectedMatch,
      };

      inputData.options.push(option);

      // Set the select's value to the selected option
      if (option.selected) {
        inputData.value = option.value;
      }
    });

    formData.inputs.push(inputData);
  });
};

/**
 * @function parseFormFromHtml
 * Extracts form data from HTML document using regex
 * @param   {string}   html - The HTML document as a string
 * @returns {FormData}      - Object containing csrf token, form action, method, and input fields
 */
function parseFormFromHtml(html: string): FormData {
  const formTag: string = parseFormTag(html);

  // Extract form attributes
  const formData: FormData = parseFormAttributes(formTag);

  const formContent = parseFormContent(html);

  if (!formContent) return formData;

  const indexMatches: Array<string> = parseInputs(formContent);

  processInputs(indexMatches, formData);

  // Find textarea elements
  const textareaMatches: Array<string> = parseTextAreas(formContent);

  processTextAreas(textareaMatches, formData);

  // Find select elements
  const selectMatches = parseSelects(formContent);

  processSelects(selectMatches, formData);

  return formData;
}

// Export types and function
export type {
  FormData,
  FormField,
  InputField,
  SelectField,
  TextareaField,
  SelectOption,
};
export {
  parseFormFromHtml,
  parseFormTag,
  parseFormAttributes,
  parseFormContent,
  parseInputs,
  parseTextAreas,
  parseSelects,
  processInputs,
  processTextAreas,
  processSelects,
};
