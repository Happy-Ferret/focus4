import {autobind} from "core-decorators";
import {debounce} from "lodash-decorators";
import {observable, ObservableMap, runInAction} from "mobx";
import {observer} from "mobx-react";
import * as React from "react";
import {themr} from "react-css-themr";
export {ObservableMap};

import {Autocomplete as RTAutocomplete, AutocompleteProps as RTAutocompleteProps, AutocompleteTheme} from "react-toolbox/lib/autocomplete";
import {InputTheme} from "react-toolbox/lib/input";
import {ProgressBar} from "react-toolbox/lib/progress_bar";

import * as styles from "./__style__/autocomplete.css";
export type AutocompleteStyle = Partial<typeof styles> & AutocompleteTheme & InputTheme;

/** Résultat du service de recherche. */
export interface AutocompleteResult {
    /** Données. */
    data?: {
        key: string;
        label: string;
    }[];
    /** Nombre total de résultat. */
    totalCount: number;
}

/** Props du composant d'autocomplétion */
export interface AutocompleteProps extends RTAutocompleteProps {
    /** Service de résolution de code. */
    keyResolver: (key: number | string) => Promise<string | undefined>;
    /** Service de recherche. */
    querySearcher: (text: string) => Promise<AutocompleteResult | undefined>;
    /** CSS. */
    theme?: AutocompleteStyle;
}

/** Surtouche de l'Autocomplete React-Toolbox pour utilisation des services de recherche serveur. */
@autobind
@observer
export class Autocomplete extends React.Component<AutocompleteProps, void> {

    /** Composant en chargement. */
    @observable protected isLoading = false;
    /** Contenu du champ texte. */
    @observable protected query = "";
    /** Liste des valeurs. */
    protected readonly values = observable.map<string>();

    /** Cette valeur est gardée à chaque retour de l'autocomplete pour savoir s'il faut ou non vider la valeur lorsqu'on saisit du texte. */
    protected value: string;

    async componentWillMount() {
        const {value, keyResolver} = this.props;
        if (value) {
            this.query = await keyResolver(value) || value;
        }
    }

    /**
     * Est appelé à chaque saisie dans le champ texte.
     * @param query Le champ texte.
     */
    async onQueryChange(query: string) {
        const {onQueryChange, onChange} = this.props;

        // On compare la query à la dernière valeur retournée par l'autocomplete : si elles sont différentes, alors on vide le champ.
        const label = this.value && this.values.get(this.value);
        if (label !== query && onChange) {
            onChange(undefined);
        }

        if (query !== this.query) {
            this.query = query;
            if (onQueryChange) {
                onQueryChange(query);
            }
            this.debouncedSearch(query);
        }
    }

    /**
     * Est appelé lorsque l'on sélectionne une valeur.
     * @param value La valeur sélectionnée.
     */
    onValueChange(value: string) {
        this.value = value;
        if (this.props.onChange) {
            this.props.onChange(value);
        }
    }

    /**
     * Effectue la recherche sur le serveur.
     * @param query Le champ texte.
     */
    async search(query: string) {
        if (query && query.trim().length) {
            this.isLoading = true;
            const result = await this.props.querySearcher(query.trim());
            runInAction(() => {
                this.values.replace(result && result.data && result.data.reduce((acc, next) => ({...acc, [next.key]: next.label}), {}) || {});
                this.isLoading = false;
            });
        }
    }

    @debounce(200)
    private debouncedSearch(query: string) {
        this.search(query);
    }

    render() {
        const {keyResolver, querySearcher, ...props} = this.props;
        return (
            <div data-focus="autocomplete">
                <RTAutocomplete
                    {...props}
                    onChange={this.onValueChange}
                    multiple={false}
                    source={this.values.toJS()}
                    query={this.query}
                    onQueryChange={this.onQueryChange}
                    maxLength={undefined}
                    suggestionMatch="disabled"
                />
                {this.isLoading ?
                    <ProgressBar type="linear" mode="indeterminate" theme={{linear: props.theme!.progressBar}} />
                : null}
            </div>
        );
    }
}

export default themr("autocomplete", styles)(Autocomplete);
