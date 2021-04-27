export interface TreeNode<T> {
	index: number;
	root: any;
	value: T;
}

/** Every single item knows their own index, updated with every operation (e.g. splice, insert) */ 
export class TreeArray<T> {
	private array: Array<TreeNode<T>>;
	private root: any;

	constructor(root: any) {
		this.array = new Array();
	}

	private reIndex(from: number) {
		for (let i = from; i < this.array.length; i++) this.array[i].index = i;
	}

	push(element: TreeNode<T>) {
		element.root = this.root;
		element.index = this.array.length;
		this.array.push(element);
	}

	insert(element: TreeNode<T>, index: number) {
		element.root = this.root;
		element.index = index;
		this.array.splice(index, 0, element);
		this.reIndex(index + 1);
	}

	splice(start: number, deleteCount: number, replaceItems?: TreeNode<T>[]): TreeNode<T>[] {
		let deletedItems = this.array.splice(start, deleteCount, ...replaceItems);

		this.reIndex(start);

		return deletedItems;
	}

	get(index: number): TreeNode<T> {
		if (index < this.array.length && index >= 0) return this.array[index];

		console.error(`error while executing TreeArray.get(${index}) -> array.length is ${this.array.length}`);
		return null;
	}
}
