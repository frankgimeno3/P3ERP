# Selectores con búsqueda

Utiliza `app/components/SearchableSelect.tsx` para elegir una entidad mediante búsqueda. No combines un input de filtro con un select o listado de selección separado.

```tsx
<SearchableSelect
  label="Proveedor"
  required
  value={providerId}
  onChange={setProviderId}
  options={providers.map(provider => ({
    value: provider.id_proveedor,
    label: provider.nombre_proveedor,
    searchText: provider.vat_code,
  }))}
/>
```

El campo abre todas las opciones al pulsarlo; al escribir las filtra e invalida la selección anterior. Solo elegir una opción comunica un identificador válido. La validación `required` comprueba la selección, no el texto escrito. Los consumidores deben aceptar `onChange('')` y deshabilitar su acción cuando la selección sea obligatoria y esté vacía.

Admite flechas, Enter y Escape. El desplegable se monta sobre los modales para evitar recortes. `disabled` impide la interacción. Para permitir una selección vacía, añade una opción `{ value: '', label: 'Sin asignar' }` y omite `required`. `onSearchChange` permite consultar opciones remotas cuando sea necesario.

Los filtros de tablas y búsquedas de navegación conservan su función; no equivalen a seleccionar un valor de un formulario.

Prueba de interacción: `scripts/test-searchable-select.cjs`, con `P3_SELECTOR_TEST_MODULES` apuntando al directorio `node_modules` que contiene `jsdom`. Comprueba filtrado, selección explícita, invalidación del valor anterior, teclado, Escape, texto sin coincidencias y estado deshabilitado sin iniciar el servidor de desarrollo.
