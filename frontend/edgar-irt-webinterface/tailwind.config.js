/** @type {import('tailwindcss').Config} */
export const content = [
  "./src/**/*.{html,ts}",
];
export const theme = {
  extend: {
    transitionProperty: {
      width: 'width',
      basis: 'flex-basis'
    }
  },
};
export const plugins = [];
