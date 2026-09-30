"use client";

import { useActionState } from "react";
import {
	createCategoryAction,
	moveCategoryAction,
	updateCategoryAction,
} from "./actions";

export type AdminCategory = {
	id: string;
	name: string;
	slug: string;
	sortOrder: number;
	isActive: boolean;
};

function CategoryRow({
	category,
	activePosition,
	activeCount,
}: {
	category: AdminCategory;
	activePosition: number;
	activeCount: number;
}) {
	const [state, formAction, pending] = useActionState(updateCategoryAction, null);

	return (
		<div className={category.isActive ? "category-admin-row" : "category-admin-row is-archived"}>
			<form action={formAction} className="category-edit-form">
				<input name="categoryId" type="hidden" value={category.id} />
				<label>
					Nombre de categoría
					<input defaultValue={category.name} maxLength={60} name="name" required />
				</label>
				<label className="category-active-toggle">
					<input defaultChecked={category.isActive} name="isActive" type="checkbox" />
					Visible en la tienda
				</label>
				<button className="category-save-button" disabled={pending} type="submit">
					{pending ? "Guardando…" : "Guardar"}
				</button>
				{state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
				{state?.success && <p className="product-form-success" role="status">{state.success}</p>}
			</form>
			{category.isActive && (
				<div className="category-order-controls" aria-label={`Orden de ${category.name}`}>
					<form action={moveCategoryAction}>
						<input name="categoryId" type="hidden" value={category.id} />
						<input name="direction" type="hidden" value="up" />
						<button aria-label={`Subir ${category.name}`} disabled={activePosition <= 0} type="submit">↑</button>
					</form>
					<form action={moveCategoryAction}>
						<input name="categoryId" type="hidden" value={category.id} />
						<input name="direction" type="hidden" value="down" />
						<button aria-label={`Bajar ${category.name}`} disabled={activePosition >= activeCount - 1} type="submit">↓</button>
					</form>
				</div>
			)}
		</div>
	);
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
	const [state, formAction, pending] = useActionState(createCategoryAction, null);
	const activeCategories = categories.filter((category) => category.isActive);

	return (
		<div className="category-manager">
			<form action={formAction} className="category-create-form">
				<label>
					Nueva categoría
					<input maxLength={60} name="name" placeholder="Ej.: Mochilas" required />
				</label>
				<button className="save-product-button" disabled={pending} type="submit">
					{pending ? "Creando…" : "Agregar categoría"}
				</button>
				{state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
				{state?.success && <p className="product-form-success" role="status">{state.success}</p>}
			</form>
			<div className="category-manager-list">
				{categories.map((category) => (
					<CategoryRow
						activeCount={activeCategories.length}
						activePosition={activeCategories.findIndex((item) => item.id === category.id)}
						category={category}
						key={category.id}
					/>
				))}
			</div>
		</div>
	);
}
