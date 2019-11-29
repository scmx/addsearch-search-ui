/* global window */
import './searchfield.scss';
import { SEARCHFIELD_TEMPLATE } from './templates';
import handlebars from 'handlebars';
import { search } from '../../actions/search';
import { autocompleteHide, keyboardEvent, setActiveSuggestion, ARROW_DOWN, ARROW_UP } from '../../actions/autocomplete';
import { setPage } from '../../actions/pagination';
import { setKeyword } from '../../actions/keyword';
import { getStore, observeStoreByKey } from '../../store';
import { MATCH_ALL_QUERY, WARMUP_QUERY_PREFIX } from '../../index';
import { redirectToSearchResultsPage } from '../../util/history';
import { validateContainer } from '../../util/dom';

const KEYCODES = {
  ARROW_DOWN: 40,
  ARROW_UP: 38,
  ENTER: 13,
  BACKSPACE: 8,
  DELETE: 46
};


export default class SearchField {

  constructor(client, conf, matchAllQueryWhenSearchFieldEmpty) {
    this.client = client;
    this.conf = conf;
    this.matchAllQuery = matchAllQueryWhenSearchFieldEmpty;
    this.firstRenderDone = false;

    if (validateContainer(conf.containerId)) {
      observeStoreByKey(getStore(), 'keyword', (kw) => this.render(kw.value));
      observeStoreByKey(getStore(), 'autocomplete', (ac) => this.onAutocompleteUpdate(ac));
    }
  }


  onAutocompleteUpdate(state) {
    if (state.suggestions.length > 0 && state.setSuggestionToSearchField) {
      // Set field value
      if (state.activeSuggestionIndex !== null && state.setSuggestionToSearchField) {
        const suggestion = state.suggestions[state.activeSuggestionIndex].value;
        this.render(suggestion);
      }
      // Revert to original typed keyword
      else if (state.activeSuggestionIndex === null) {
        this.render(getStore().getState().keyword.value);
      }
    }
  }


  executeSearch(client, keyword) {
    let kw = keyword;
    if (kw === '' && this.matchAllQuery) {
      kw = MATCH_ALL_QUERY;
    }

    const store = getStore();
    if (kw.indexOf(WARMUP_QUERY_PREFIX) !== 0) {
      store.dispatch(setPage(client, 1));
    }
    store.dispatch(search(client, kw));
  }


  redirectOrSearch(keyword) {
    const searchResultsPageUrl = getStore().getState().search.searchResultsPageUrl;

    // Redirect to results page
    if (searchResultsPageUrl && keyword && keyword.length > 0) {
      redirectToSearchResultsPage(searchResultsPageUrl, keyword);
    }

    // Search
    else {
      this.executeSearch(this.client, keyword);
    }
  }


  render(preDefinedKeyword) {
    const container = document.getElementById(this.conf.containerId);

    // Field already exists. Don't re-render
    if (container.querySelector('input')) {
      if (preDefinedKeyword &&
          preDefinedKeyword !== MATCH_ALL_QUERY &&
          container.querySelector('input').value !== preDefinedKeyword) {
        container.querySelector('input').value = preDefinedKeyword;
      }
      return;
    }

    // New field. Render
    container.innerHTML = handlebars.compile(this.conf.template || SEARCHFIELD_TEMPLATE)(this.conf);
    this.field = container.querySelector('input');

    // Set value. Don't pass with data to handlebars to get the keyboard caret position right on all browsers
    if (preDefinedKeyword !== MATCH_ALL_QUERY) {
      this.field.value = preDefinedKeyword;
    }

    // Event listeners to the field
    this.field.oninput = (e) => this.oninput(e);
    this.field.onkeypress = (e) => this.onkeypress(e);
    this.field.onkeyup = (e) => this.onkeyup(e);
    this.field.onfocus = (e) => this.onfocus(e);
    this.field.onblur = (e) => setTimeout(() => this.onblur(), 200); // Possible search button onclick event first

    // Event listeners to the possible search button
    if (container.querySelector('button')) {
      container.querySelector('button').onclick = (e) => {
        const keyword = this.field.value;
        this.redirectOrSearch(keyword);
      }
    }

    // Event listeners to the form
    if (container.querySelector('form')) {
      container.querySelector('form').onsubmit = (e) => e.preventDefault();
    }


    // Autofocus when loaded first time
    if (this.conf.autofocus !== false &&
      this.firstRenderDone === false) {
      this.field.focus();
      this.firstRenderDone = true;
    }
  }


  /**
   * Input field events
   */

  // Handle characters and backspace
  oninput(e) {
    const keyword = e.target.value;
    const store = getStore();

    // Keyword being erased
    if (e.keyCode === KEYCODES.BACKSPACE || e.keyCode === KEYCODES.DELETE) {
      store.dispatch(setActiveSuggestion(null, false));
    }

    store.dispatch(setKeyword(keyword, false));
    if (this.conf.searchAsYouType === true) {
      this.executeSearch(this.client, keyword);
    }
  }

  // Handle keyboard navi
  onkeyup(e) {
    const store = getStore();
    if (e.keyCode === KEYCODES.ARROW_DOWN) {
      store.dispatch(keyboardEvent(ARROW_DOWN));
    }
    else if (e.keyCode === KEYCODES.ARROW_UP) {
      store.dispatch(keyboardEvent(ARROW_UP));
    }
  }

  // Handle enter
  onkeypress(e) {
    if (e.keyCode === KEYCODES.ENTER) {
      const store = getStore();
      const keyword = e.target.value;
      store.dispatch(setKeyword(keyword, true));
      store.dispatch(autocompleteHide());
      this.redirectOrSearch(keyword);
    }
  }


  onfocus(e) {
    // Warmup query
    if (e.target.value === '') {
      this.executeSearch(this.client, WARMUP_QUERY_PREFIX + Math.random());
    }
  }


  onblur() {
    if (getStore().getState().autocomplete.hideAutomatically) {
      getStore().dispatch(autocompleteHide());
    }
  }
}