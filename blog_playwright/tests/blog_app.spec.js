const { test, expect, beforeEach, describe } = require('@playwright/test');
const { afterEach } = require('node:test');
const { loginUser, createBlog } = require('./helper');

describe('Blog app', () => {
    let user;
    let anotherUser;

    beforeEach(async ({ page, request }) => {
        // Reset the testing environment before each test
        await request.post('http://localhost:3003/api/testing/reset ');
    
        // Create users for the backend
        user = {
            username: 'Duane',
            password: 'yanited',
        };
        await request.post('http://localhost:3003/api/users', { data: user });
    
        anotherUser = {
            username: 'AnotherUser',
            password: 'password123',
        };
        await request.post('http://localhost:3003/api/users', { data: anotherUser });
    
        // Navigate to the application's URL
        await page.goto('http://localhost:5173');
    });
    
    afterEach(async ({ request }) => {
        // Reset the database after each test to clean up any test data
        await request.post('http://localhost:3003/api/testing/reset');
    });
    

    test('Login form is shown', async ({ page }) => {
        // Check that the login form is visible
        const loginForm = await page.$('form');
        expect(loginForm).toBeTruthy();

        // Check that the login form contains the expected input fields
        const usernameInput = await page.$('input[name="Username"]');
        const passwordInput = await page.$('input[name="Password"]');
        expect(usernameInput).toBeTruthy();
        expect(passwordInput).toBeTruthy();

        // Check that the login form contains a submit button
        const submitButton = await page.$('button[type="submit"]');
        expect(submitButton).toBeTruthy();
    });

    describe('Login', () => {
        test('succeeds with correct credentials', async ({ page }) => {
            // Log in with the user's credentials
            await loginUser(page, user);
    
            // Check that the user is logged in and a logout button is visible
            const loggedInUser = await page.innerText('p');
            expect(loggedInUser).toContain(user.username);
    
            // Check for the presence of a logout button (or any element that indicates successful login)
            const logoutButton = await page.$('button:has-text("logout")');
            expect(logoutButton).toBeTruthy();
        });
    
        test('fails with wrong credentials', async ({ page }) => {
            // Fill in the login form with incorrect credentials
            const wrongCredentials = {
                username: user.username,
                password: 'wrongpassword',
            };
            await loginUser(page, wrongCredentials);
    
            // Check that an error message is visible
            await expect(page.getByText('Wrong username or password')).toBeVisible();
    
            // Check that the login form is still visible
            const loginForm = await page.$('form');
            expect(loginForm).toBeTruthy();
        });
    });

    describe('When logged in', () => {
        beforeEach(async ({ page }) => {
            // Log in the user
            await loginUser(page, user);
        });
    
        test('a new blog can be created', async ({ page }) => {
            const blogData = {
                title: 'Test Blog Title',
                author: 'Test Blog Author',
                url: 'http://testblogurl.com',
            };
    
            await createBlog(page, blogData);
    
            // Check that the new blog appears in the list of blogs
            const newBlog = await page.innerText(`.blog:has-text("${blogData.title}")`);
            expect(newBlog).toContain(blogData.title);
            expect(newBlog).toContain(blogData.author);
        });
    });

    describe('Liking a blog', () => {
        let blogData;
    
        beforeEach(async ({ page }) => {
            // Log in the user
            await loginUser(page, user);
    
            // Create a new blog
            blogData = {
                title: 'Test Blog Title',
                author: 'Test Blog Author',
                url: 'http://testblogurl.com',
            };
            await createBlog(page, blogData);
        });
    
        test('a blog can be liked', async ({ page }) => {
            // Ensure the blog is visible
            await page.click('button:has-text("view")');
    
            // Get the initial number of likes
            const likesElement = await page.$('.blog .blog-likes span');
            const initialLikes = await likesElement.innerText();
            const initialLikesNumber = parseInt(initialLikes, 10);
    
            // Click the like button
            await page.click('button:has-text("like")');
    
            // Wait for the number of likes to increase
            await page.waitForTimeout(1000); // Wait for a short time to ensure the update is processed
    
            // Get the updated number of likes
            const updatedLikes = await likesElement.innerText();
            const updatedLikesNumber = parseInt(updatedLikes, 10);
    
            // Check that the number of likes has increased
            expect(updatedLikesNumber).toBe(initialLikesNumber + 1);
        });
    });

    describe('Deleting a blog', () => {
        let blogData;

        beforeEach(async ({ page }) => {
            // Log in the user
            await loginUser(page, user);

            // Create a new blog
            blogData = {
                title: 'Test Blog Title',
                author: 'Test Blog Author',
                url: 'http://testblogurl.com',
            };
            await createBlog(page, blogData);
        });

        test('the user who added the blog can delete the blog', async ({ page }) => {
            // Ensure the blog is visible
            await page.click('button:has-text("view")');

            // Handle the confirmation dialog for deleting the blog
            page.once('dialog', async dialog => {
                console.log(`Dialog message: ${dialog.message()}`);
                await dialog.accept();
            });

            // Click the "remove" button
            await page.click('button:has-text("remove")');

            // Check if the success message is visible after deleting the blog
            await expect(page.getByText(`Blog ${blogData.title} by ${blogData.author} removed`)).toBeVisible();
        });

        test('only the user who added the blog can see the delete button', async ({ page }) => {
            // Log out the current user
            await page.click('button:has-text("logout")');

            // Log in as another user
            await loginUser(page, anotherUser);

            // Ensure the blog is visible
            await page.click('button:has-text("view")');

            // Check if the delete button is not visible for the other user
            const deleteButton = await page.$('button:has-text("remove")');
            expect(deleteButton).toBeNull();
        });
    });

    describe('Blog order', () => {
        beforeEach(async ({ page }) => {
            // Log in the user
            await loginUser(page, user);
        });

        test('blogs are ordered by number of likes in descending order', async ({ page }) => {
            // Create multiple blogs with different number of likes
            const blogs = [
                { title: 'Blog 1', author: 'Author 1', url: 'http://blog1.com', likes: 5 },
                { title: 'Blog 2', author: 'Author 2', url: 'http://blog2.com', likes: 10 },
                { title: 'Blog 3', author: 'Author 3', url: 'http://blog3.com', likes: 1 },
            ];

            for (const blog of blogs) {
                await createBlog(page, blog);
            }

            // Reload the page to ensure the blogs are displayed
            await page.reload();

            // Get all blog elements and their likes
            const blogElements = await page.$$('.blog');
            const likes = await Promise.all(blogElements.map(async blogElement => {
                const likeText = await blogElement.$eval('.blog-likes', el => el.innerText);
                return parseInt(likeText.replace('likes', '').trim(), 10);
            }));

            // Check if the likes are in descending order
            for (let i = 0; i < likes.length - 1; i++) {
                expect(likes[i]).toBeGreaterThanOrEqual(likes[i + 1]);
            }
        });
    });        
});
