import {InputProps} from "react-toolbox/lib/input";
import {DisplayProps} from "../components";
import {BaseDisplayProps, BaseInputProps, BaseLabelProps, Domain, EntityField, FieldEntry} from "./types";

/**
 * Construit un `EntityField` à partir d'une valeur quelconque.
 * @param value La valeur.
 * @param $field Les métadonnées pour le champ à créer.
 */
export function makeField<
    T,
    ICProps extends BaseInputProps = InputProps,
    DCProps extends BaseDisplayProps = DisplayProps,
    LCProps extends BaseLabelProps = BaseLabelProps
>(
    value: T,
    $field: Partial<FieldEntry<ICProps, DCProps, LCProps>> = {}
) {
    return {$field, value} as EntityField<T, Domain<ICProps, DCProps, LCProps>>;
}

/**
 * Patche un `EntityField` pour modifier ses métadonnées (inclus tout ce qui est définit dans le domaine).
 * @param field Le champ.
 * @param $field Les métadonnées à remplacer.
 */
export function patchField<
    T,
    ICDomainProps extends BaseInputProps = InputProps,
    DCDomainProps extends BaseDisplayProps = DisplayProps,
    LCDomainProps extends BaseLabelProps = BaseLabelProps,
    ICProps = ICDomainProps,
    DCProps = DCDomainProps,
    LCProps = LCDomainProps
>(
    field: EntityField<T, Domain<ICDomainProps, DCDomainProps, LCDomainProps>>,
    $field: Partial<FieldEntry<ICProps, DCProps, LCProps> & Domain<ICProps, DCProps, LCProps>>
) {
    const {
        domain = field.$field.domain,
        isRequired = field.$field.isRequired,
        label = field.$field.label,
        name = field.$field.name,
        type = field.$field.type,
        ...domainOverrides
    } = $field;
    return {
        $field: {
            isRequired,
            label,
            name,
            type,
            domain: {
                ...domain,
                ...domainOverrides,
                inputProps: {
                    ...(domain.inputProps as any),
                    ...(domainOverrides.inputProps as any)
                },
                displayProps: {
                    ...(domain.displayProps as any),
                    ...(domainOverrides.displayProps as any)
                },
                labelProps: {
                    ...(domain.labelProps as any),
                    ...(domainOverrides.labelProps as any)
                }
            },
        },
        value: field.value
    } as EntityField<T, Domain<ICProps, DCProps, LCProps>>;
}
