import './index.scss';
import oa from 'es6-object-assign';

import ActiveFilters from './components/activefilters';
import Autocomplete from './components/autocomplete';
import Facets from './components/facets';
import HierarchicalFacets from './components/hierarchicalfacets';
import Filters from './components/filters';
import FilterStateObserver, { createFilterObject } from './components/filters/filterstateobserver';
import LoadMore from './components/loadmore';
import Pagination from './components/pagination';
import SearchField from './components/searchfield';
import SearchResults from './components/searchresults';
import SegmentedResults from './components/segmentedresults';
import SortBy from './components/sortby';
import { initRedux } from './store';
import { setExternalAnalyticsCallback, setCollectAnalytics } from './util/analytics';
import { registerDefaultHelpers, registerHelper, registerPartial } from './util/handlebars';
import { initFromURL } from './util/history';
import { autocompleteHide } from './actions/autocomplete';
import { start, search, setSearchResultsPageUrl, clearSearchResults } from './actions/search';
import { segmentedSearch } from './actions/segmentedsearch';
import { setKeyword } from './actions/keyword';
import { sortBy } from './actions/sortby';
import { clearSelected } from './actions/filters';
import { HISTORY_PARAMETERS } from "./util/history";

export const WARMUP_QUERY_PREFIX = '_addsearch_';
export const MATCH_ALL_QUERY = '*';

// Static
oa.polyfill();
registerDefaultHelpers();

export default class AddSearchUI {

  constructor(client, settings) {
    this.client = client;
    this.segmentedSearchClients = {};
    this.settings = settings || {};
    HISTORY_PARAMETERS.SEARCH = this.settings.searchParameter || HISTORY_PARAMETERS.SEARCH;
    this.hasSearchResultsComponent = false;
    this.reduxStore = initRedux(this.settings);
  }


  start() {
    this.initFromClientSettings();

    // Feed analytics manually with the sendStatsEvent function
    this.client.setCollectAnalytics(false);
    setExternalAnalyticsCallback(this.settings.analyticsCallback);
    setCollectAnalytics(this.settings.collectAnalytics);

    this.reduxStore.dispatch(setSearchResultsPageUrl(this.settings.searchResultsPageUrl));

    // Possible custom function to create filter group with custom and/or logic
    const createFilterObjectFunction = this.settings && this.settings.createFilterObjectFunction ?
      this.settings.createFilterObjectFunction : createFilterObject;

    // Handle browser history if the user is on a results page (i,e. not just a search field on any page)
    if (this.hasSearchResultsComponent) {
      initFromURL(this.client, this.reduxStore,
        createFilterObjectFunction,
        (keyword, onResultsScrollTo) => this.executeSearch(keyword, onResultsScrollTo, false,
          null, this.settings.fieldForInstantRedirect),
        this.settings.matchAllQuery,
        this.settings.baseFilters
      );
    }

    // FilterStateObserver to update client's filter object when any of the filters change
    new FilterStateObserver(this.client, this.reduxStore, createFilterObjectFunction, this.settings.onFilterChange,
      this.settings.baseFilters, this.segmentedSearchClients);

    // Possible match all query on load
    if (this.settings.matchAllQuery === true) {
      this.matchAllQuery();
    }

    this.reduxStore.dispatch(start());
  }


  executeSearch(keyword, onResultsScrollTo, searchAsYouType, fieldForInstantRedirect, fieldForInstantRedirectGlobal) {
    this.reduxStore.dispatch(search(this.client, keyword, onResultsScrollTo, false, searchAsYouType,
      this.reduxStore, fieldForInstantRedirect, null, fieldForInstantRedirectGlobal));

    for (let key in this.segmentedSearchClients) {
      this.reduxStore.dispatch(segmentedSearch(this.segmentedSearchClients[key].client, key, keyword));
    }
  }


  /*
   * Utils
   */

  initFromClientSettings() {
    const paging = this.client.getSettings().paging;
    this.reduxStore.dispatch(sortBy(this.client, paging.sortBy, paging.sortOrder));
  }

  matchAllQuery(onResultsScrollTo) {
    const store = this.reduxStore;
    if (store.getState().keyword.value === '') {
      store.dispatch(setKeyword(MATCH_ALL_QUERY, true));
      this.executeSearch(MATCH_ALL_QUERY, onResultsScrollTo, false);
    }
  }

  log(msg) {
    if (this.settings.debug) {
      console.log(msg);
    }
  }


  /*
   * Components
   */

  searchField(conf) {
    if (conf.fieldForInstantRedirect) {
      console.log('WARNING: searchField setting "fieldForInstantRedirect" is deprecated. Use it ' +
        'in Search UI configuration object instead.');
    }
    const onSearch = (keyword, onResultsScrollTo, searchAsYouType, fieldForInstantRedirect, fieldForInstantRedirectGlobal) =>
      this.executeSearch(keyword, onResultsScrollTo, searchAsYouType, fieldForInstantRedirect, fieldForInstantRedirectGlobal);
    new SearchField(this.client, this.reduxStore, conf, this.settings.matchAllQuery === true, onSearch);
  }

  autocomplete(conf) {
    new Autocomplete(this.client, this.reduxStore, conf);
  }

  searchResults(conf) {
    this.hasSearchResultsComponent = true;
    new SearchResults(this.client, this.reduxStore, conf);
  }

  segmentedSearchResults(conf) {
    if (!conf.client) {
      console.log('WARNING: segmentedResults component must have a client instance');
      return;
    }
    this.hasSearchResultsComponent = true;
    this.segmentedSearchClients[conf.containerId] = {};
    this.segmentedSearchClients[conf.containerId].client = conf.client;
    this.segmentedSearchClients[conf.containerId].originalFilters = Object.assign({}, conf.client.getSettings().filterObject);
    new SegmentedResults(conf.client, this.reduxStore, conf);
  }

  facets(conf) {
    new Facets(this.client, this.reduxStore, conf, this.settings.baseFilters);
  }

  hierarchicalFacets(conf) {
    new HierarchicalFacets(this.client, this.reduxStore, conf, this.settings.baseFilters);
  }

  filters(conf) {
    new Filters(this.client, this.reduxStore, conf);
  }

  sortBy(conf) {
    new SortBy(this.client, this.reduxStore, conf);
  }

  pagination(conf) {
    new Pagination(this.client, this.reduxStore, conf);
  }

  loadMore(conf) {
    new LoadMore(this.client, this.reduxStore, conf);
  }

  activeFilters(conf) {
    new ActiveFilters(this.client, this.reduxStore, conf);
  }

  /*
   * Public functions
   */

  search(keyword) {
    this.reduxStore.dispatch(setKeyword(keyword, true));
    this.executeSearch(keyword, null, false);
  }

  hideAutocomplete() {
    this.reduxStore.dispatch(autocompleteHide());
  }

  clear() {
    const store = this.reduxStore;
    store.dispatch(setKeyword('', true));
    store.dispatch(clearSelected(true));

    if (this.settings.matchAllQuery === true) {
      this.matchAllQuery('top');
    }
    else {
      store.dispatch(clearSearchResults('top'));
    }
  }

  registerHandlebarsHelper(helperName, helperFunction) {
    registerHelper(helperName, helperFunction);
  }

  registerHandlebarsPartial(partialName, partialTemplate) {
    registerPartial(partialName, partialTemplate);
  }
}
