import {autobind} from "core-decorators";
import i18next from "i18next";
import {computed, observable} from "mobx";
import {observer} from "mobx-react";
import * as React from "react";
import {themr} from "react-css-themr";

import {ReactComponent} from "../config";

import {BaseDisplayProps, BaseInputProps, BaseLabelProps, Domain} from "./types";
import {validate} from "./validation";

import * as styles from "./__style__/field.css";

export type FieldStyle = Partial<typeof styles>;

export type RefValues<T, ValueKey extends string, LabelKey extends string> = {[P in ValueKey]: T} & {[P in LabelKey]: string};

/** Options pour gérer une liste de référence. */
export interface ReferenceOptions<
    T,
    R extends RefValues<T, ValueKey, LabelKey>,
    ValueKey extends string,
    LabelKey extends string
> {
    /** Nom de la propriété de libellé. Doit être casté en lui-même (ex: `{labelKey: "label" as "label"}`). Par défaut: "label". */
    labelKey?: LabelKey;
    /** Nom de la propriété de valeur. Doit être casté en lui-même (ex: `{valueKey: "code" as "code"}`). Par défaut: "code". */
    valueKey?: ValueKey;
    /** Liste des valeurs de la liste de référence. Doit contenir les propriétés `valueKey` et `labelKey`. */
    values?: R[];
}

/** Options pour un champ défini à partir de `fieldFor` et consorts. */
export interface FieldOptions<
    T,
    ICProps extends BaseInputProps,
    DCProps extends BaseDisplayProps,
    LCProps extends BaseLabelProps,
    R extends RefValues<T, ValueKey, LabelKey>,
    ValueKey extends string,
    LabelKey extends string
> extends ReferenceOptions<T, R, ValueKey, LabelKey> {
    /** Par défaut : 12. */
    contentSize?: number;
    /** Surcharge l'erreur du field. */
    error?: string | null;
    /** Force l'affichage de l'erreur, même si le champ n'a pas encore été modifié. */
    forceErrorDisplay?: boolean;
    /** Service de résolution de code. */
    keyResolver?: (key: number | string) => Promise<string>;
    /** Affiche le label. */
    hasLabel?: boolean;
    /** A utiliser à la place de `ref`. */
    innerRef?: (i: Field<T, ICProps, DCProps, LCProps, R, ValueKey, LabelKey>) => void;
    /** Champ en édition. */
    isEdit?: boolean;
    /** Par défaut : "top". */
    labelCellPosition?: string;
    /** Par défaut : 4. */
    labelSize?: number;
    /** Handler de modification de la valeur. */
    onChange?: ICProps["onChange"];
    /** CSS. */
    theme?: FieldStyle;
}

/** Props pour le Field, se base sur le contenu d'un domaine (éventuellement patché) et des options de champ. */
export interface FieldProps<T, ICProps extends BaseInputProps, DCProps extends BaseDisplayProps, LCProps extends BaseLabelProps, R extends RefValues<T, ValueKey, LabelKey>, ValueKey extends string, LabelKey extends string>
    extends
        Domain<ICProps, DCProps, LCProps>,
        FieldOptions<T, ICProps, DCProps, LCProps, R, ValueKey, LabelKey> {
    /** Composant pour l'affichage. */
    DisplayComponent: ReactComponent<DCProps>;
    /** Formatteur pour l'affichage du champ en consulation. */
    displayFormatter: (value: T) => string;
    /** Composant pour l'entrée utilisateur. */
    InputComponent: ReactComponent<ICProps>;
    /** Formatteur pour l'affichage du champ en édition. */
    inputFormatter: (value: T) => string;
    /** Champ requis. */
    isRequired?: boolean;
    /** Libellé du champ. */
    label?: string;
    /** Composant pour le libellé. */
    LabelComponent: ReactComponent<LCProps>;
    /** Nom du champ. */
    name: string;
    /** Formatteur inverse pour convertir l'affichage du champ en la valeur (édition uniquement) */
    unformatter: (text: string) => T;
    /** Valeur. */
    value: T;
}

/** Composant de champ, gérant des composants de libellé, d'affichage et/ou d'entrée utilisateur. */
@autobind
@observer
export class Field<
    T,
    ICProps extends BaseInputProps,
    DCProps extends BaseDisplayProps,
    LCProps extends BaseLabelProps,
    R extends RefValues<T, ValueKey, LabelKey> ,
    ValueKey extends string,
    LabelKey extends string
> extends React.Component<FieldProps<T, ICProps, DCProps, LCProps, R, ValueKey, LabelKey>, void> {

    /** Affiche l'erreur du champ. Initialisé à `false` pour ne pas afficher l'erreur dès l'initilisation du champ avant la moindre saisie utilisateur. */
    @observable showError = this.props.forceErrorDisplay || false;

    componentWillUpdate({value}: FieldProps<T, ICProps, DCProps, LCProps, R, ValueKey, LabelKey>) {
        // On affiche l'erreur dès que et à chaque fois que l'utilisateur modifie la valeur (et à priori pas avant).
        if (value) {
            this.showError = true;
        }
    }

    /** Récupère l'erreur associée au champ. Si la valeur vaut `undefined`, alors il n'y en a pas. */
    @computed
    get error(): string | undefined {
        const {error, value} = this.props;

        // On priorise l'éventuelle erreur passée en props.
        if (error !== undefined) {
            return error || undefined;
        }

        // On vérifie que le champ n'est pas vide et obligatoire.
        const {isRequired, validator, label = ""} = this.props;
        if (isRequired && (value as any) !== 0 && !value) {
            return i18next.t("focus.validation.required");
        }

        // On applique le validateur du domaine.
        if (validator && value !== undefined && value !== null) {
            const validStat = validate({value, name: i18next.t(label)}, validator);
            if (validStat.errors.length) {
                return i18next.t(validStat.errors.join(", "));
            }
        }

        // Pas d'erreur.
        return undefined;
    }

    /** Appelé lors d'un changement sur l'input. */
    onChange(value: any) {
        const {onChange, unformatter} = this.props;
        if (onChange) {
            (onChange as any)(unformatter && unformatter(value) || value);
        }
    }

    /** Affiche le composant d'affichage (`DisplayComponent`). */
    display() {
        const {valueKey = "code", labelKey = "label", values, value, keyResolver, displayFormatter, DisplayComponent, displayProps = {}} = this.props;
        return (
            <DisplayComponent
                {...displayProps as {}}
                formatter={displayFormatter}
                keyResolver={keyResolver}
                labelKey={labelKey}
                value={value}
                valueKey={valueKey}
                values={values}
            />
        );
    }

    /** Affiche le composant d'entrée utilisateur (`InputComponent`). */
    input() {
        const {InputComponent, inputFormatter, value, valueKey = "code", labelKey = "label", values, keyResolver, inputProps, name} = this.props;

        let props: any = {
            ...inputProps as {},
            value: inputFormatter(value),
            error: this.showError && this.error || undefined,
            name,
            onChange: this.onChange
        };

        if (values) {
            props = {...props, values, labelKey, valueKey};
        }

        if (keyResolver) {
            props = {...props, keyResolver};
        }

        return <InputComponent {...props} />;
    }

    /** Affiche le composant de libellé (`LabelComponent`). */
    label() {
        const {name, label, LabelComponent} = this.props;
        return <LabelComponent name={name} text={label} />;
    }

    render() {
        const {contentSize = 12, labelSize = 4, isRequired, hasLabel = true, isEdit, theme, className = ""} = this.props;
        return (
            <div className={`${theme!.field} ${isEdit ? theme!.edit : ""} ${this.error && this.showError ? theme!.invalid : ""} ${isRequired ? theme!.required : ""} ${className}`}>
                {hasLabel ?
                    <div style={{width: `${labelSize * 100 / contentSize}%`}} className={theme!.label}>
                        {this.label()}
                    </div>
                : null}
                <div style={{width: `${(contentSize - (hasLabel ? labelSize : 0)) * 100 / contentSize}%`}} className ={`${theme!.value} ${className}`}>
                    {isEdit ? this.input() : this.display()}
                </div>
            </div>
        );
    }
}

export default themr("field", styles)(Field);
