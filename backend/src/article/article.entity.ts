import {
  ArrayType,
  Collection,
  Entity,
  EntityDTO,
  ManyToOne,
  ManyToMany,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from '@mikro-orm/core';
import slug from 'slug';

import { User } from '../user/user.entity';
import { Comment } from './comment.entity';

@Entity()
export class Article {
  @PrimaryKey({ type: 'number' })
  id: number;

  @Property({ fieldName: 'slug' })
  slug: string;

  @Property({ fieldName: 'title' })
  title: string;

  @Property({ fieldName: 'description' })
  description = '';

  @Property({ fieldName: 'body' })
  body = '';

  @Property({ type: 'date', fieldName: 'created_at' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt = new Date();

  @Property({ type: ArrayType, fieldName: 'tag_list' })
  tagList: string[] = [];

  // 🔹 Original Author
  @ManyToOne(() => User, { fieldName: 'author_id' })
  author: User;

  // 🔹 NEW: Co-Authors (Many-to-Many)
  @ManyToMany(() => User, (user) => user.coAuthoredArticles, {
    owner: true,
    pivotTable: 'article_co_authors',
  })
  coAuthors = new Collection<User>(this);

  // 🔹 Lock Owner
  @ManyToOne(() => User, { nullable: true, fieldName: 'locked_by_user_id' })
  lockedBy?: User;

  // 🔹 Lock Timestamp
  @Property({ type: 'date', nullable: true, fieldName: 'locked_at' })
  lockedAt?: Date;

  // 🔹 Version for race protection
  @Property({ type: 'number', default: 0, fieldName: 'lock_version' })
  lockVersion = 0;

  @OneToMany(() => Comment, (comment) => comment.article, {
    eager: true,
    orphanRemoval: true,
  })
  comments = new Collection<Comment>(this);

  @Property({ type: 'number', fieldName: 'favorites_count' })
  favoritesCount = 0;

  constructor(author: User, title: string, description: string, body: string) {
    this.author = author;
    this.title = title;
    this.description = description;
    this.body = body;
    this.slug =
      slug(title, { lower: true }) +
      '-' +
      ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
  }

  toJSON(user?: User) {
    const o = wrap<Article>(this).toObject() as ArticleDTO;

    o.favorited =
      user && user.favorites.isInitialized()
        ? user.favorites.contains(this)
        : false;

    o.author = this.author.toJSON(user);

    // 🔹 Include coAuthors in response
    o.coAuthors = this.coAuthors.isInitialized()
      ? this.coAuthors.getItems().map((u) => u.toJSON(user))
      : [];

    o.lockedBy = this.lockedBy ? this.lockedBy.toJSON(user) : null;
    o.lockedAt = this.lockedAt;

    return o;
  }
}

export interface ArticleDTO extends EntityDTO<Article> {
  favorited?: boolean;
  coAuthors?: any[];
  lockedBy?: any;
  lockedAt?: Date | null;
}
