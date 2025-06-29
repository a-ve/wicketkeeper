import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import "./style.css";

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {});
  },
};
