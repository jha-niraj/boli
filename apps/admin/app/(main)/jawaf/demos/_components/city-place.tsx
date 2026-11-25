import { nepalDistrictOfCity, nepalProvinceLabel, nepalProvinceOf } from "@repo/core/geo/nepal"

/** Under the City picker: the district and province of a listed city ("Kaski district, Gandaki Province"). */
export function CityPlace({ city }: { city: string }) {
    const district = nepalDistrictOfCity(city)
    const province = district ? nepalProvinceOf(district) : null
    if (!district || !province) return null
    return <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{district} district, {nepalProvinceLabel(province)}</p>
}
