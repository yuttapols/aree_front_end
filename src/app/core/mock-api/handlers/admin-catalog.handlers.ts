import {
  CategoryUpsertRequest,
  OptionGroupUpsertRequest,
  ProductUpsertRequest,
  SortOrderItem,
} from '../../api/models/catalog.model';
import { FieldError } from '../../api/models/common.model';
import type { MockState } from '../mock-db';
import { toCategory, toProduct } from '../mock-domain';
import {
  MockRouter,
  bodyOf,
  numberParam,
  queryNumber,
  queryString,
  requireAdmin,
  requireStaff,
} from '../mock-router';
import { MockHttpError, badRequest, nextId, notFound, paginate, required } from '../mock-utils';

function validateCategory(state: MockState, request: CategoryUpsertRequest, id?: number): void {
  const fields: FieldError[] = [];
  required(request.name, 'name', fields);
  required(request.slug, 'slug', fields);
  if (request.slug && !/^[a-z0-9-]+$/.test(request.slug)) {
    fields.push({ field: 'slug', message: 'slug format' });
  }
  if (state.categories.some((category) => category.slug === request.slug && category.id !== id)) {
    fields.push({ field: 'slug', message: 'slug already used' });
  }
  if (fields.length) {
    throw badRequest('Validation failed', fields);
  }
}

function validateProduct(state: MockState, request: ProductUpsertRequest, id?: number): void {
  const fields: FieldError[] = [];
  required(request.name, 'name', fields);
  required(request.code, 'code', fields);
  if (!(request.price >= 0)) {
    fields.push({ field: 'price', message: 'price >= 0' });
  }
  if (!state.categories.some((category) => category.id === request.categoryId)) {
    fields.push({ field: 'categoryId', message: 'invalid category' });
  }
  if (
    state.products.some(
      (product) => product.code.toUpperCase() === request.code?.toUpperCase() && product.id !== id,
    )
  ) {
    fields.push({ field: 'code', message: 'code already used' });
  }
  if (fields.length) {
    throw badRequest('Validation failed', fields);
  }
}

function validateOptionGroup(request: OptionGroupUpsertRequest): void {
  const fields: FieldError[] = [];
  required(request.name, 'name', fields);
  if (request.minSelect < 0 || request.maxSelect < request.minSelect || request.maxSelect < 1) {
    fields.push({ field: 'maxSelect', message: 'min/max invalid' });
  }
  if (!request.items?.length) {
    fields.push({ field: 'items', message: 'items required' });
  }
  request.items?.forEach((item, index) => required(item.name, `items[${index}].name`, fields));
  if (fields.length) {
    throw badRequest('Validation failed', fields);
  }
}

function applyOptionItems(state: MockState, request: OptionGroupUpsertRequest) {
  return request.items.map((item, index) => ({
    id: item.id ?? nextId(state, 'option_item'),
    name: item.name.trim(),
    nameEn: item.nameEn?.trim() || item.name.trim(),
    extraPrice: Number(item.extraPrice) || 0,
    isAvailable: item.isAvailable,
    sortOrder: index + 1,
  }));
}

export function registerAdminCatalogHandlers(router: MockRouter): void {
  router
    .get('/admin/categories', (context) => {
      requireStaff(context);
      return [...context.state.categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => toCategory(context.state, category));
    })
    .post('/admin/categories', (context) => {
      requireAdmin(context);
      const request = bodyOf<CategoryUpsertRequest>(context);
      validateCategory(context.state, request);
      const category = {
        id: nextId(context.state, 'category'),
        name: request.name.trim(),
        nameEn: request.nameEn?.trim() || request.name.trim(),
        slug: request.slug,
        description: request.description ?? '',
        icon: request.icon || 'pi pi-star',
        sortOrder: context.state.categories.length + 1,
        isActive: request.isActive,
        palette: null,
      };
      context.state.categories.push(category);
      return toCategory(context.state, category);
    })
    .put('/admin/categories/:id', (context) => {
      requireAdmin(context);
      const category = context.state.categories.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!category) {
        throw notFound();
      }
      const request = bodyOf<CategoryUpsertRequest>(context);
      validateCategory(context.state, request, category.id);
      Object.assign(category, {
        name: request.name.trim(),
        nameEn: request.nameEn?.trim() || request.name.trim(),
        slug: request.slug,
        description: request.description ?? '',
        icon: request.icon || category.icon,
        isActive: request.isActive,
      });
      return toCategory(context.state, category);
    })
    .delete('/admin/categories/:id', (context) => {
      requireAdmin(context);
      const category = context.state.categories.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!category) {
        throw notFound();
      }
      category.isActive = false;
      return null;
    })
    .patch('/admin/categories/sort', (context) => {
      requireAdmin(context);
      for (const item of bodyOf<SortOrderItem[]>(context)) {
        const category = context.state.categories.find((candidate) => candidate.id === item.id);
        if (category) {
          category.sortOrder = item.sortOrder;
        }
      }
      return null;
    })
    .get('/admin/products', (context) => {
      requireStaff(context);
      const categoryId = queryString(context, 'categoryId');
      const keyword = queryString(context, 'keyword').toLowerCase();
      const active = queryString(context, 'active');
      const products = [...context.state.products]
        .filter(
          (product) =>
            (!categoryId || product.categoryId === Number(categoryId)) &&
            (!keyword ||
              `${product.code} ${product.name} ${product.nameEn}`
                .toLowerCase()
                .includes(keyword)) &&
            (!active || product.isActive === (active === 'true')),
        )
        .sort((a, b) => a.categoryId - b.categoryId || a.sortOrder - b.sortOrder)
        .map((product) => toProduct(context.state, product));
      return paginate(products, queryNumber(context, 'page', 0), queryNumber(context, 'size', 10));
    })
    .post('/admin/products', (context) => {
      requireAdmin(context);
      const request = bodyOf<ProductUpsertRequest>(context);
      validateProduct(context.state, request);
      const product = {
        ...request,
        id: nextId(context.state, 'product'),
        code: request.code.toUpperCase(),
        nameEn: request.nameEn || request.name,
        descriptionEn: request.descriptionEn || request.description,
        sortOrder: context.state.products.length + 1,
        rating: 5,
        reviews: 0,
        palette: null,
      };
      context.state.products.push(product);
      return toProduct(context.state, product);
    })
    .put('/admin/products/:id', (context) => {
      requireAdmin(context);
      const product = context.state.products.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!product) {
        throw notFound();
      }
      const request = bodyOf<ProductUpsertRequest>(context);
      validateProduct(context.state, request, product.id);
      Object.assign(product, {
        ...request,
        code: request.code.toUpperCase(),
        nameEn: request.nameEn || request.name,
        descriptionEn: request.descriptionEn || request.description,
      });
      return toProduct(context.state, product);
    })
    .delete('/admin/products/:id', (context) => {
      requireAdmin(context);
      const product = context.state.products.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!product) {
        throw notFound();
      }
      product.isActive = false;
      return null;
    })
    .patch('/admin/products/:id/availability', (context) => {
      requireStaff(context);
      const product = context.state.products.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!product) {
        throw notFound();
      }
      product.isAvailable = Boolean(bodyOf<{ isAvailable: boolean }>(context).isAvailable);
      return toProduct(context.state, product);
    })
    .get('/admin/option-groups', (context) => {
      requireStaff(context);
      return [...context.state.optionGroups].sort((a, b) => a.sortOrder - b.sortOrder);
    })
    .post('/admin/option-groups', (context) => {
      requireAdmin(context);
      const request = bodyOf<OptionGroupUpsertRequest>(context);
      validateOptionGroup(request);
      const group = {
        id: nextId(context.state, 'option_group'),
        name: request.name.trim(),
        nameEn: request.nameEn?.trim() || request.name.trim(),
        minSelect: request.minSelect,
        maxSelect: request.maxSelect,
        isActive: request.isActive,
        sortOrder: context.state.optionGroups.length + 1,
        items: applyOptionItems(context.state, request),
      };
      context.state.optionGroups.push(group);
      return group;
    })
    .put('/admin/option-groups/:id', (context) => {
      requireAdmin(context);
      const group = context.state.optionGroups.find(
        (candidate) => candidate.id === numberParam(context, 'id'),
      );
      if (!group) {
        throw notFound();
      }
      const request = bodyOf<OptionGroupUpsertRequest>(context);
      validateOptionGroup(request);
      Object.assign(group, {
        name: request.name.trim(),
        nameEn: request.nameEn?.trim() || request.name.trim(),
        minSelect: request.minSelect,
        maxSelect: request.maxSelect,
        isActive: request.isActive,
        items: applyOptionItems(context.state, request),
      });
      return group;
    })
    .delete('/admin/option-groups/:id', (context) => {
      requireAdmin(context);
      const id = numberParam(context, 'id');
      if (context.state.products.some((product) => product.optionGroupIds.includes(id))) {
        throw new MockHttpError(409, 'CONCURRENT_UPDATE', 'Option group is in use');
      }
      context.state.optionGroups = context.state.optionGroups.filter((group) => group.id !== id);
      return null;
    });
}
