const { test } = require('@playwright/test');

async function loginUser(page, user) {
  await page.fill('input[name="Username"]', user.username);
  await page.fill('input[name="Password"]', user.password);
  await page.click('button[type="submit"]');
}

async function createBlog(page, blogData) {
  // Wait for the "new blog" button to be visible and click it
  await page.waitForSelector('button:has-text("new blog")', { timeout: 10000 });
  await page.click('button:has-text("new blog")');

  // Wait for the blog form to be visible
  await page.waitForSelector('#title', { timeout: 10000 });

  // Fill in the blog form using IDs
  await page.fill('#title', blogData.title);
  await page.fill('#author', blogData.author);
  await page.fill('#url', blogData.url);

  // Submit the form to create the new blog
  await page.click('button[type="submit"]');

  // Wait for the new blog to appear in the list of blogs
  await page.waitForSelector(`.blog:has-text("${blogData.title}")`, { timeout: 10000 });
}

module.exports = { loginUser, createBlog };